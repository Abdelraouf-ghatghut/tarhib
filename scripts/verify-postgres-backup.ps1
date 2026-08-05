param(
  [Parameter(Mandatory = $true)][string]$BackupPath,
  [string]$Container = 'tarhib-postgres',
  [string]$User = 'tarhib'
)

# PR-2.4/2.5 - REAL verification: decrypt (if .enc) then restore into a
# dedicated throwaway database, instead of just `pg_restore --list` (which
# only proves the archive is readable, not that a restore actually succeeds
# - a broken constraint or corrupted schema would pass --list just fine).
# The throwaway database is dropped after verification, never left behind.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'backup-crypto.ps1')

$resolved = (Resolve-Path -LiteralPath $BackupPath).Path
if ((Get-Item -LiteralPath $resolved).Length -eq 0) { throw 'Backup is empty.' }

$isEncrypted = $resolved.EndsWith('.enc')
$plainLocalPath = $resolved
$tempPlainFile = $null
if ($isEncrypted) {
  $tempPlainFile = [System.IO.Path]::GetTempFileName()
  Unprotect-BackupFile -InputPath $resolved -OutputPath $tempPlainFile
  $plainLocalPath = $tempPlainFile
}

$restoreDb = "tarhib_restore_verify_$(Get-Date -Format 'yyyyMMddHHmmss')"
$containerPath = "/tmp/tarhib-verify-$([Guid]::NewGuid().ToString('N')).dump"
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

try {
  docker cp $plainLocalPath "${Container}:$containerPath"
  if ($LASTEXITCODE -ne 0) { throw 'docker cp failed.' }

  docker exec $Container createdb -U $User $restoreDb
  if ($LASTEXITCODE -ne 0) { throw "createdb $restoreDb failed." }

  try {
    docker exec $Container pg_restore -U $User -d $restoreDb --no-owner --no-acl $containerPath
    if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed - the backup does NOT restore cleanly.' }

    # Proof that the restored database is actually usable, not just that
    # pg_restore did not complain: at least one known application table with
    # readable rows (an empty database would "succeed" without proving anything).
    $tableCount = docker exec $Container psql -U $User -d $restoreDb -tAc `
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
    if ([int]($tableCount.Trim()) -eq 0) { throw 'Restored database has zero tables - restore is not usable.' }

    $employeeCount = docker exec $Container psql -U $User -d $restoreDb -tAc `
      "SELECT count(*) FROM employees" 2>$null
    Write-Output "Restore verified: $($tableCount.Trim()) tables, $($employeeCount.Trim()) employees rows readable."
  } finally {
    docker exec $Container dropdb -U $User --if-exists $restoreDb | Out-Null
  }
} finally {
  docker exec $Container rm -f $containerPath | Out-Null
  if ($tempPlainFile) { Remove-Item -LiteralPath $tempPlainFile -Force -ErrorAction SilentlyContinue }
}

$stopwatch.Stop()
# RTO (PR-2.6): real restore time for THIS data volume, to report in the
# runbook - not a theoretical number.
Write-Output "Restore + verification completed in $($stopwatch.Elapsed.TotalSeconds.ToString('0.0'))s."
