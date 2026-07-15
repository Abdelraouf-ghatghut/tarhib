param(
  [string]$Container = 'tarhib-postgres',
  [string]$Database = 'tarhib_dev',
  [string]$User = 'tarhib',
  [string]$OutputDirectory = '.backups'
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$targetDirectory = [System.IO.Path]::GetFullPath((Join-Path $root $OutputDirectory))
if (-not $targetDirectory.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Backup directory must remain inside the workspace.'
}
New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $targetDirectory "tarhib-$stamp.dump"
$process = Start-Process -FilePath 'docker' -ArgumentList @('exec', $Container, 'pg_dump', '-U', $User, '-d', $Database, '--format=custom', '--no-owner', '--no-acl') -RedirectStandardOutput $target -NoNewWindow -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "pg_dump failed with exit code $($process.ExitCode)." }
if ((Get-Item -LiteralPath $target).Length -eq 0) { throw 'PostgreSQL backup is empty.' }
Write-Output $target
