param(
  [string]$Container = 'tarhib-postgres',
  [string]$Database = 'tarhib_dev',
  [string]$User = 'tarhib',
  [string]$OutputDirectory = '.backups'
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
. (Join-Path $PSScriptRoot 'backup-crypto.ps1')

$targetDirectory = [System.IO.Path]::GetFullPath((Join-Path $root $OutputDirectory))
if (-not $targetDirectory.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Backup directory must remain inside the workspace.'
}
New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$plainTarget = Join-Path $targetDirectory "tarhib-$stamp.dump"
$process = Start-Process -FilePath 'docker' -ArgumentList @('exec', $Container, 'pg_dump', '-U', $User, '-d', $Database, '--format=custom', '--no-owner', '--no-acl') -RedirectStandardOutput $plainTarget -NoNewWindow -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "pg_dump failed with exit code $($process.ExitCode)." }
if ((Get-Item -LiteralPath $plainTarget).Length -eq 0) { throw 'PostgreSQL backup is empty.' }

# PR-2.4: encrypted before any storage/transfer - never leave a plaintext
# dump lying around, even locally (the unencrypted .dump file is removed
# right after, see finally).
$encryptedTarget = "$plainTarget.enc"
try {
  Protect-BackupFile -InputPath $plainTarget -OutputPath $encryptedTarget
} finally {
  Remove-Item -LiteralPath $plainTarget -Force
}

# Externalization (PR-2.4): best-effort, only if configured - an encrypted
# backup that stays local is NOT a complete backup policy
# (CLAUDE.md/PRODUCTION_RUNBOOK.md require a second region), so this warns
# loudly instead of silently implying it is done.
if ($env:BACKUP_S3_BUCKET) {
  $awsCmd = Get-Command aws -ErrorAction SilentlyContinue
  if (-not $awsCmd) {
    Write-Warning "BACKUP_S3_BUCKET is set but the AWS CLI is not installed - backup stayed local-only at $encryptedTarget. Install the AWS CLI (or an S3-compatible equivalent) to externalize backups."
  } else {
    $s3Key = "postgres/$(Split-Path -Leaf $encryptedTarget)"
    $s3Uri = "s3://$($env:BACKUP_S3_BUCKET)/$s3Key"
    $awsArgs = @('s3', 'cp', $encryptedTarget, $s3Uri)
    if ($env:BACKUP_S3_ENDPOINT) { $awsArgs += @('--endpoint-url', $env:BACKUP_S3_ENDPOINT) }
    & aws @awsArgs
    if ($LASTEXITCODE -ne 0) { throw "Upload to $s3Uri failed (exit code $LASTEXITCODE) - the encrypted backup remains at $encryptedTarget for manual retry." }
    Write-Output "Uploaded to $s3Uri"
  }
} else {
  Write-Warning "BACKUP_S3_BUCKET is not set - backup stayed local-only at $encryptedTarget, not externalized to a second region as the backup policy requires (see PRODUCTION_RUNBOOK.md)."
}

Write-Output $encryptedTarget
