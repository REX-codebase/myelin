# Myelin installer for Windows (Windows PowerShell 5.1 and PowerShell 7).
#
#   irm https://raw.githubusercontent.com/REX-codebase/myelin/main/install.ps1 | iex
#
# Installs the app to %LOCALAPPDATA%\Myelin\app and a myelin.cmd launcher to
# %LOCALAPPDATA%\Myelin\bin, then adds that folder to your user PATH. Needs
# Node.js 18 or newer; it never installs Node.js itself. Running it again
# upgrades in place.
#
# From a file:  .\install.ps1 [-Ref <ref>] [-NoModifyPath] [-Uninstall] [-Yes]
# Piped to iex you cannot pass parameters, so set these environment variables first:
#   $env:MYELIN_REF = 'v0.2.1'          same as -Ref
#   $env:MYELIN_NO_MODIFY_PATH = '1'    same as -NoModifyPath
#   $env:MYELIN_UNINSTALL = '1'         same as -Uninstall
#   $env:MYELIN_YES = '1'               same as -Yes

param(
    [string]$Ref,
    [switch]$NoModifyPath,
    [switch]$Uninstall,
    [switch]$Yes
)

function Install-Myelin {
    # Local to this function, so the user's session preferences are not changed.
    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'

    $repo = 'REX-codebase/myelin'
    $minNodeMajor = 18
    $marker = 'myelin-installer'

    $gitRef = $Ref
    if (-not $gitRef) { $gitRef = $env:MYELIN_REF }
    if (-not $gitRef) { $gitRef = 'main' }
    $doUninstall = [bool]$Uninstall -or ($env:MYELIN_UNINSTALL -eq '1')
    $skipPath = [bool]$NoModifyPath -or ($env:MYELIN_NO_MODIFY_PATH -eq '1')
    $assumeYes = [bool]$Yes -or ($env:MYELIN_YES -eq '1')

    $useColor = (-not $env:NO_COLOR) -and (-not [Console]::IsOutputRedirected)
    $utf = $false
    try { $utf = [Console]::OutputEncoding.WebName -match 'utf-8' } catch { $utf = $false }
    $tick = '+'
    $cross = 'x'
    $dot = '*'
    if ($utf) {
        $tick = [string][char]0x2713
        $cross = [string][char]0x2717
        $dot = [string][char]0x25C6
    }

    function Show-Line([string]$mark, [string]$text, [string]$color) {
        if ($useColor) {
            Write-Host "  $mark " -NoNewline -ForegroundColor $color
            Write-Host $text
        } else {
            Write-Host "  $mark $text"
        }
    }
    function Say-Ok([string]$text) { Show-Line $tick $text 'Green' }
    function Say-Warn([string]$text) { Show-Line $dot $text 'Yellow' }
    function Say-Info([string]$text) {
        if ($useColor) { Write-Host "    $text" -ForegroundColor DarkGray } else { Write-Host "    $text" }
    }

    $root = if ($env:MYELIN_HOME) { $env:MYELIN_HOME } else { Join-Path $env:LOCALAPPDATA 'Myelin' }
    $appDir = Join-Path $root 'app'
    $binDir = Join-Path $root 'bin'
    $shim = Join-Path $binDir 'myelin.cmd'
    $appEntry = Join-Path $appDir 'bin\myelin.mjs'

    # Banner
    $banner = @(
        '  +------------------------------------+',
        '  |  *  M Y E L I N                    |',
        '  |     rule ledgers for AI code       |',
        '  +------------------------------------+'
    )
    Write-Host ''
    foreach ($line in $banner) {
        if ($useColor) { Write-Host $line -ForegroundColor Cyan } else { Write-Host $line }
    }
    Write-Host ''

    function Remove-MyelinInstall {
        # Called from Install-Myelin; reuses its variables through dynamic scoping.
        $shimExists = Test-Path -LiteralPath $shim
        if (-not $assumeYes) {
            if ([Console]::IsInputRedirected) {
                throw 'No terminal to ask on. Set $env:MYELIN_YES = "1" (or pass -Yes) to remove Myelin without a prompt.'
            }
            $answer = Read-Host "  Remove Myelin from $root? [y/N]"
            if ($answer -notmatch '^(y|yes)$') {
                Say-Info 'Cancelled. Nothing was removed.'
                return
            }
        }

        if ($shimExists) {
            if (Select-String -LiteralPath $shim -SimpleMatch $marker -Quiet) {
                Remove-Item -LiteralPath $shim -Force
                Say-Ok "Removed $shim"
            } else {
                Say-Warn "Left $shim alone: it was not made by this installer."
            }
        } else {
            Say-Info "No launcher at $shim"
        }

        if (Test-Path -LiteralPath $appDir) {
            Remove-Item -LiteralPath $appDir -Recurse -Force
            Say-Ok "Removed $appDir"
        } else {
            Say-Info "No app at $appDir"
        }

        Get-ChildItem -LiteralPath $root -Force -Directory -Filter '.staging-*' -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
        Get-ChildItem -LiteralPath $root -Force -Directory -Filter '.previous-*' -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

        foreach ($dir in @($binDir, $root)) {
            if ((Test-Path -LiteralPath $dir) -and -not (Get-ChildItem -LiteralPath $dir -Force)) {
                Remove-Item -LiteralPath $dir -Force
            }
        }

        if (-not $skipPath) {
            $norm = $binDir.TrimEnd('\')
            $current = [Environment]::GetEnvironmentVariable('Path', 'User')
            if ($current) {
                $all = @($current -split ';' | Where-Object { $_ -ne '' })
                $kept = @($all | Where-Object { $_.TrimEnd('\') -ine $norm })
                if ($kept.Count -ne $all.Count) {
                    [Environment]::SetEnvironmentVariable('Path', ($kept -join ';'), 'User')
                    Say-Ok "Removed $binDir from your user PATH"
                }
            }
        }

        Write-Host ''
        Say-Ok 'Myelin is uninstalled.'
    }

    $failed = $false
    $stage = $null
    $backup = $null
    $tmp = $null
    try {
        if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA is not set. This installer is for Windows.' }
        if ($gitRef -notmatch '^[A-Za-z0-9._/-]+$' -or $gitRef -match '\.\.') {
            throw "Invalid ref '$gitRef'. Use letters, digits, and . _ - / only."
        }
        if ($root -match '[%"]' -or $binDir -match '[%"]') {
            throw 'The install folder may not contain % or quotes. Set $env:MYELIN_HOME to a simpler folder.'
        }

        if ($doUninstall) {
            Remove-MyelinInstall
            return
        }

        # Node.js
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $nodeCmd) {
            throw ("Node.js $minNodeMajor or newer is required, but 'node' was not found.`n`n" +
                "    Install the current LTS, then run this installer again:`n`n" +
                "      winget install OpenJS.NodeJS.LTS`n" +
                "      https://nodejs.org/en/download`n" +
                "      fnm install 22, then fnm use 22     (if you use fnm)`n")
        }
        $node = $nodeCmd.Source
        $nodeVersion = ''
        try { $nodeVersion = [string](& $node -p 'process.versions.node' 2>$null | Select-Object -First 1) } catch { $nodeVersion = '' }
        $nodeMajor = 0
        if ($nodeVersion -match '^(\d+)\.') { $nodeMajor = [int]$Matches[1] }
        if ($nodeMajor -lt $minNodeMajor) {
            throw ("Node.js $nodeVersion is installed, but Myelin needs $minNodeMajor or newer.`n`n" +
                "    Upgrade Node.js, then run this installer again:`n`n" +
                "      winget upgrade OpenJS.NodeJS.LTS`n" +
                "      https://nodejs.org/en/download`n")
        }
        Say-Ok "Node.js v$nodeVersion"

        # Refuse early if the launcher path belongs to something else.
        if ((Test-Path -LiteralPath $shim) -and -not (Select-String -LiteralPath $shim -SimpleMatch $marker -Quiet)) {
            throw "$shim already exists and was not made by this installer. Move it, or set `$env:MYELIN_HOME to another folder."
        }

        # Download
        $tmp = Join-Path ([IO.Path]::GetTempPath()) ('myelin-install-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $tmp | Out-Null
        $zip = Join-Path $tmp 'myelin.zip'
        if ($env:MYELIN_ZIP) {
            if (-not (Test-Path -LiteralPath $env:MYELIN_ZIP -PathType Leaf)) { throw "MYELIN_ZIP does not exist: $env:MYELIN_ZIP" }
            Copy-Item -LiteralPath $env:MYELIN_ZIP -Destination $zip
            Say-Ok 'Using local archive'
        } else {
            $url = "https://codeload.github.com/$repo/zip/$gitRef"
            try {
                [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
                Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip
            } catch {
                throw "Could not download Myelin ($gitRef) from GitHub.`n    Check your internet connection and try again.`n    To install another version, set `$env:MYELIN_REF to a tag, then run this again."
            }
            Say-Ok "Downloaded Myelin ($gitRef)"
        }

        # Unpack and check
        $unpacked = Join-Path $tmp 'unpacked'
        try {
            Expand-Archive -LiteralPath $zip -DestinationPath $unpacked -Force
        } catch {
            throw 'The download is not a valid zip archive. Try again, or use a tag with -Ref.'
        }
        $top = Get-ChildItem -LiteralPath $unpacked -Directory | Select-Object -First 1
        if (-not $top -or -not (Test-Path -LiteralPath (Join-Path $top.FullName 'bin\myelin.mjs'))) {
            throw 'The archive does not look like Myelin (bin\myelin.mjs is missing).'
        }
        Say-Ok 'Unpacked the archive'

        # Stage next to the install, self-check, then swap
        New-Item -ItemType Directory -Force -Path $root | Out-Null
        $stage = Join-Path $root ('.staging-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
        Move-Item -LiteralPath $top.FullName -Destination $stage

        $newVersion = ''
        try { $newVersion = [string](& $node (Join-Path $stage 'bin\myelin.mjs') version 2>$null | Select-Object -First 1) } catch { $newVersion = '' }
        if (-not $newVersion) {
            throw 'The new build failed its self-check. Your existing install, if any, was left as it was.'
        }
        Say-Ok "Self-check passed (myelin $newVersion)"

        $previous = ''
        if (Test-Path -LiteralPath $appDir) {
            try { $previous = [string](& $node $appEntry version 2>$null | Select-Object -First 1) } catch { $previous = '' }
            $backup = Join-Path $root ('.previous-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
            try {
                Move-Item -LiteralPath $appDir -Destination $backup
            } catch {
                throw "Could not replace the app in $appDir. Close any open 'myelin' windows, then try again."
            }
        }
        try {
            Move-Item -LiteralPath $stage -Destination $appDir
            $stage = $null
        } catch {
            if ($backup) { Move-Item -LiteralPath $backup -Destination $appDir; $backup = $null }
            throw "Could not move the new build into $appDir."
        }
        if ($backup) {
            Remove-Item -LiteralPath $backup -Recurse -Force -ErrorAction SilentlyContinue
            $backup = $null
        }
        if ($previous) {
            Say-Ok "Replaced myelin $previous at $appDir"
        } else {
            Say-Ok "Installed the app to $appDir"
        }

        # Launcher shim
        New-Item -ItemType Directory -Force -Path $binDir | Out-Null
        $shimText = "@echo off`r`n" +
            "rem $marker: generated by install.ps1. Re-run the installer to upgrade, or run it with -Uninstall to remove.`r`n" +
            "node `"$appEntry`" %*`r`n"
        [IO.File]::WriteAllText($shim, $shimText, [Text.Encoding]::Default)
        Say-Ok "Wrote the launcher to $shim"

        # User PATH
        if ($skipPath) {
            Say-Info "Skipped PATH. To run 'myelin' by name, add $binDir to your PATH."
        } else {
            $norm = $binDir.TrimEnd('\')
            $current = [Environment]::GetEnvironmentVariable('Path', 'User')
            $parts = @()
            if ($current) { $parts = @($current -split ';' | Where-Object { $_ -ne '' }) }
            $present = @($parts | Where-Object { $_.TrimEnd('\') -ieq $norm })
            if ($present.Count -eq 0) {
                $newPath = (@($parts) + $binDir) -join ';'
                [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
                Say-Ok "Added $binDir to your user PATH"
                Say-Info 'Open a new terminal to pick it up.'
            } else {
                Say-Ok "$binDir is on your user PATH"
            }
            $sessionParts = @($env:Path -split ';' | Where-Object { $_.TrimEnd('\') -ieq $norm })
            if ($sessionParts.Count -eq 0) { $env:Path = "$env:Path;$binDir" }
        }

        Write-Host ''
        Say-Ok "Myelin $newVersion is ready (ref: $gitRef)"
        Write-Host ''
        if ($useColor) {
            Write-Host '  Next: run `myelin setup`' -ForegroundColor White
        } else {
            Write-Host '  Next: run `myelin setup`'
        }
    } catch {
        $failed = $true
        $message = $_.Exception.Message
        Write-Host ''
        if ($useColor) {
            Write-Host "  $cross " -NoNewline -ForegroundColor Red
            Write-Host $message
        } else {
            Write-Host "  $cross $message"
        }
        Write-Host ''
    } finally {
        if ($backup -and (Test-Path -LiteralPath $backup)) {
            # Interrupted between the two moves: put the previous install back.
            if (-not (Test-Path -LiteralPath $appDir)) { Move-Item -LiteralPath $backup -Destination $appDir -ErrorAction SilentlyContinue }
        }
        if ($stage -and (Test-Path -LiteralPath $stage)) { Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue }
        if ($tmp -and (Test-Path -LiteralPath $tmp)) { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
    }

    if ($failed -and $PSCommandPath) { exit 1 }
}

Install-Myelin
