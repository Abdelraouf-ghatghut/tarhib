param(
  [Parameter(Mandatory = $true)][string]$BackupPath,
  [string]$Container = 'tarhib-postgres'
)

$ErrorActionPreference = 'Stop'
$resolved = (Resolve-Path -LiteralPath $BackupPath).Path
if ((Get-Item -LiteralPath $resolved).Length -eq 0) { throw 'Backup is empty.' }
$containerPath = "/tmp/tarhib-verify-$([Guid]::NewGuid().ToString('N')).dump"
docker cp $resolved "${Container}:$containerPath"
if ($LASTEXITCODE -ne 0) { throw 'docker cp failed.' }
try {
  $archiveContents = docker exec $Container pg_restore --list $containerPath
  if ($LASTEXITCODE -ne 0) { throw 'pg_restore could not read the archive.' }
  $archiveContents | Select-Object -First 20
  Write-Output 'Backup archive is readable.'
} finally {
  docker exec $Container rm -f $containerPath | Out-Null
}
