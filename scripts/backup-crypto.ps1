# PR-2.4 - AES-256-CBC encryption for backups, dot-sourced by
# backup-postgres.ps1 / verify-postgres-backup.ps1. Native .NET
# implementation (System.Security.Cryptography): no external dependency
# (openssl/gpg) required, works wherever PowerShell runs.
#
# File format: [salt 16 bytes][iv 16 bytes][AES-256-CBC ciphertext]
# Key derived from BACKUP_ENCRYPTION_KEY (passphrase, required) via
# PBKDF2-HMACSHA256, 210000 iterations (OWASP 2023 recommendation).

function Get-BackupEncryptionKey {
  param([byte[]]$Salt)
  $passphrase = $env:BACKUP_ENCRYPTION_KEY
  if ([string]::IsNullOrWhiteSpace($passphrase)) {
    throw 'BACKUP_ENCRYPTION_KEY is not set - a passphrase is required to encrypt/decrypt backups. Never commit it; store it in the platform secret manager (see PRODUCTION_RUNBOOK.md).'
  }
  $deriveBytes = New-Object System.Security.Cryptography.Rfc2898DeriveBytes(
    $passphrase, $Salt, 210000, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
  try {
    return $deriveBytes.GetBytes(32)
  } finally {
    $deriveBytes.Dispose()
  }
}

function Protect-BackupFile {
  param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )
  # RandomNumberGenerator.Fill() is .NET Core-only; Windows PowerShell 5.1
  # runs on .NET Framework, which needs the instance-based API instead.
  $salt = New-Object byte[] 16
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($salt)
  } finally {
    $rng.Dispose()
  }
  $key = Get-BackupEncryptionKey -Salt $salt

  $aes = [System.Security.Cryptography.Aes]::Create()
  try {
    $aes.Key = $key
    $aes.GenerateIV()
    $inStream = [System.IO.File]::OpenRead($InputPath)
    $outStream = [System.IO.File]::Create($OutputPath)
    try {
      $outStream.Write($salt, 0, $salt.Length)
      $outStream.Write($aes.IV, 0, $aes.IV.Length)
      $cryptoStream = New-Object System.Security.Cryptography.CryptoStream(
        $outStream, $aes.CreateEncryptor(), [System.Security.Cryptography.CryptoStreamMode]::Write)
      try {
        $inStream.CopyTo($cryptoStream)
      } finally {
        $cryptoStream.Dispose()
      }
    } finally {
      $inStream.Dispose()
      $outStream.Dispose()
    }
  } finally {
    $aes.Dispose()
  }
}

function Unprotect-BackupFile {
  param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )
  $inStream = [System.IO.File]::OpenRead($InputPath)
  try {
    $salt = New-Object byte[] 16
    $iv = New-Object byte[] 16
    if ($inStream.Read($salt, 0, 16) -ne 16) { throw 'Encrypted backup is truncated (missing salt).' }
    if ($inStream.Read($iv, 0, 16) -ne 16) { throw 'Encrypted backup is truncated (missing IV).' }
    $key = Get-BackupEncryptionKey -Salt $salt

    $aes = [System.Security.Cryptography.Aes]::Create()
    try {
      $aes.Key = $key
      $aes.IV = $iv
      $outStream = [System.IO.File]::Create($OutputPath)
      try {
        $cryptoStream = New-Object System.Security.Cryptography.CryptoStream(
          $inStream, $aes.CreateDecryptor(), [System.Security.Cryptography.CryptoStreamMode]::Read)
        try {
          $cryptoStream.CopyTo($outStream)
        } finally {
          $cryptoStream.Dispose()
        }
      } finally {
        $outStream.Dispose()
      }
    } finally {
      $aes.Dispose()
    }
  } finally {
    $inStream.Dispose()
  }
}
