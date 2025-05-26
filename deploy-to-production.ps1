# FilmFlex Production Deployment Script
# This script deploys the FilmFlex application to production server

param(
    [string]$ServerIP = "38.54.115.156",
    [string]$Username = "root",
    [string]$Password = "Cuongtm2012$",
    [switch]$SkipDatabase,
    [switch]$DataOnly,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
FilmFlex Production Deployment Script

Usage:
  .\deploy-to-production.ps1 [-ServerIP <IP>] [-Username <user>] [-Password <pass>] [-SkipDatabase] [-DataOnly]

Parameters:
  -ServerIP      Production server IP address (default: 38.54.115.156)
  -Username      SSH username (default: root)
  -Password      SSH password (default: Cuongtm2012$)
  -SkipDatabase  Skip database setup (only deploy application)
  -DataOnly      Only sync database data (skip application deployment)
  -Help          Show this help message

Examples:
  .\deploy-to-production.ps1                    # Full deployment
  .\deploy-to-production.ps1 -SkipDatabase      # Deploy app only
  .\deploy-to-production.ps1 -DataOnly          # Sync database only
"@
    exit 0
}

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    switch ($Color) {
        "Red" { Write-Host "[$timestamp] $Message" -ForegroundColor Red }
        "Green" { Write-Host "[$timestamp] $Message" -ForegroundColor Green }
        "Yellow" { Write-Host "[$timestamp] $Message" -ForegroundColor Yellow }
        "Blue" { Write-Host "[$timestamp] $Message" -ForegroundColor Blue }
        default { Write-Host "[$timestamp] $Message" }
    }
}

function Test-SSHConnection {
    param([string]$Server, [string]$User, [string]$Pass)
    
    Write-Log "Testing SSH connection to $Server..." "Blue"
    
    # Create SSH command to test connection
    $testCommand = "echo 'SSH connection successful'"
    
    try {
        # Use plink if available, otherwise use ssh
        if (Get-Command plink -ErrorAction SilentlyContinue) {
            $result = echo y | plink -ssh -pw $Pass $User@$Server $testCommand 2>&1
        } elseif (Get-Command ssh -ErrorAction SilentlyContinue) {
            $env:SSHPASS = $Pass
            $result = ssh -o "StrictHostKeyChecking=no" $User@$Server $testCommand 2>&1
        } else {
            Write-Log "No SSH client found. Please install OpenSSH or PuTTY." "Red"
            return $false
        }
        
        if ($result -match "SSH connection successful") {
            Write-Log "SSH connection test passed!" "Green"
            return $true
        } else {
            Write-Log "SSH connection test failed: $result" "Red"
            return $false
        }
    } catch {
        Write-Log "SSH connection error: $($_.Exception.Message)" "Red"
        return $false
    }
}

function Invoke-SSHCommand {
    param([string]$Server, [string]$User, [string]$Pass, [string]$Command)
    
    try {
        if (Get-Command plink -ErrorAction SilentlyContinue) {
            $result = echo y | plink -ssh -pw $Pass $User@$Server $Command 2>&1
        } elseif (Get-Command ssh -ErrorAction SilentlyContinue) {
            $env:SSHPASS = $Pass
            $result = ssh -o "StrictHostKeyChecking=no" $User@$Server $Command 2>&1
        } else {
            throw "No SSH client available"
        }
        return $result
    } catch {
        throw "SSH command failed: $($_.Exception.Message)"
    }
}

function Copy-FileToServer {
    param([string]$LocalPath, [string]$RemotePath, [string]$Server, [string]$User, [string]$Pass)
    
    Write-Log "Copying $LocalPath to server..." "Blue"
    
    try {
        if (Get-Command pscp -ErrorAction SilentlyContinue) {
            $result = echo y | pscp -pw $Pass $LocalPath $User@${Server}:$RemotePath 2>&1
        } elseif (Get-Command scp -ErrorAction SilentlyContinue) {
            $env:SSHPASS = $Pass
            $result = scp -o "StrictHostKeyChecking=no" $LocalPath $User@${Server}:$RemotePath 2>&1
        } else {
            throw "No SCP client available"
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "File copied successfully!" "Green"
            return $true
        } else {
            Write-Log "File copy failed: $result" "Red"
            return $false
        }
    } catch {
        Write-Log "File copy error: $($_.Exception.Message)" "Red"
        return $false
    }
}

# Main deployment function
function Start-Deployment {
    Write-Log "🚀 Starting FilmFlex Production Deployment" "Green"
    Write-Log "Target Server: $ServerIP" "Blue"
    Write-Log "Username: $Username" "Blue"
    
    # Test SSH connection
    if (-not (Test-SSHConnection -Server $ServerIP -User $Username -Pass $Password)) {
        Write-Log "❌ Cannot connect to server. Please check credentials and network connectivity." "Red"
        exit 1
    }
    
    # Get current directory
    $currentDir = Get-Location
    $sourceDir = $currentDir.Path
    
    Write-Log "Source directory: $sourceDir" "Blue"
    
    # Step 1: Prepare server environment
    if (-not $DataOnly) {
        Write-Log "📋 Step 1: Preparing server environment..." "Yellow"
        
        $setupCommands = @(
            "apt-get update",
            "apt-get install -y curl git nginx postgresql postgresql-contrib",
            "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
            "apt-get install -y nodejs",
            "npm install -g pm2",
            "mkdir -p /var/www/filmflex",
            "mkdir -p /var/log/filmflex",
            "mkdir -p /tmp/filmflex-deploy"
        )
        
        foreach ($cmd in $setupCommands) {
            Write-Log "Executing: $cmd" "Blue"
            try {
                $result = Invoke-SSHCommand -Server $ServerIP -User $Username -Pass $Password -Command $cmd
                Write-Log "✅ Command completed" "Green"
            } catch {
                Write-Log "⚠️ Command warning: $($_.Exception.Message)" "Yellow"
            }
        }
    }
    
    # Step 2: Setup PostgreSQL database
    if (-not $SkipDatabase) {
        Write-Log "🗄️ Step 2: Setting up PostgreSQL database..." "Yellow"
        
        # Copy schema file to server
        $schemaPath = Join-Path $sourceDir "shared\schema_filmflex.sql"
        if (Test-Path $schemaPath) {
            if (Copy-FileToServer -LocalPath $schemaPath -RemotePath "/tmp/schema_filmflex.sql" -Server $ServerIP -User $Username -Pass $Password) {
                
                $dbCommands = @(
                    "systemctl start postgresql",
                    "systemctl enable postgresql",
                    "sudo -u postgres createuser --interactive --pwprompt filmflex || echo 'User may already exist'",
                    "sudo -u postgres createdb filmflex || echo 'Database may already exist'",
                    "sudo -u postgres psql -c `"ALTER USER filmflex WITH PASSWORD 'filmflex2024';`"",
                    "sudo -u postgres psql -d filmflex -f /tmp/schema_filmflex.sql"
                )
                
                foreach ($cmd in $dbCommands) {
                    Write-Log "Executing: $cmd" "Blue"
                    try {
                        $result = Invoke-SSHCommand -Server $ServerIP -User $Username -Pass $Password -Command $cmd
                        Write-Log "✅ Database command completed" "Green"
                    } catch {
                        Write-Log "⚠️ Database command warning: $($_.Exception.Message)" "Yellow"
                    }
                }
            }
        } else {
            Write-Log "❌ Schema file not found at $schemaPath" "Red"
        }
    }
    
    # Step 3: Deploy application code
    if (-not $DataOnly) {
        Write-Log "📦 Step 3: Deploying application code..." "Yellow"
        
        # Create deployment package
        $tempDir = [System.IO.Path]::GetTempPath()
        $deployPackage = Join-Path $tempDir "filmflex-deploy.tar.gz"
        
        Write-Log "Creating deployment package..." "Blue"
        
        # Files to exclude from deployment
        $excludePatterns = @(
            "node_modules",
            ".git",
            "logs",
            "*.log",
            "cypress",
            "tests",
            ".env",
            "dist"
        )
        
        # Create tar command
        $tarCommand = "tar -czf `"$deployPackage`" --exclude-from=<(printf '%s\n' " + ($excludePatterns -join ' ') + ") -C `"$sourceDir`" ."
        
        try {
            # For Windows, we'll use PowerShell's Compress-Archive as fallback
            $filesToCompress = Get-ChildItem -Path $sourceDir -Recurse | Where-Object {
                $relativePath = $_.FullName.Substring($sourceDir.Length + 1)
                -not ($excludePatterns | Where-Object { $relativePath -like "*$_*" })
            }
            
            $tempExtractDir = Join-Path $tempDir "filmflex-source"
            if (Test-Path $tempExtractDir) { Remove-Item $tempExtractDir -Recurse -Force }
            New-Item -ItemType Directory -Path $tempExtractDir | Out-Null
            
            # Copy files to temp directory
            foreach ($file in $filesToCompress) {
                $relativePath = $file.FullName.Substring($sourceDir.Length + 1)
                $destPath = Join-Path $tempExtractDir $relativePath
                $destDir = Split-Path $destPath -Parent
                
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                }
                
                if ($file.PSIsContainer) {
                    if (-not (Test-Path $destPath)) {
                        New-Item -ItemType Directory -Path $destPath | Out-Null
                    }
                } else {
                    Copy-Item $file.FullName $destPath -Force
                }
            }
            
            # Create archive
            Compress-Archive -Path "$tempExtractDir\*" -DestinationPath $deployPackage -Force
            Write-Log "✅ Deployment package created" "Green"
            
        } catch {
            Write-Log "❌ Failed to create deployment package: $($_.Exception.Message)" "Red"
            exit 1
        }
        
        # Copy deployment package to server
        if (Copy-FileToServer -LocalPath $deployPackage -RemotePath "/tmp/filmflex-deploy.tar.gz" -Server $ServerIP -User $Username -Pass $Password) {
            
            # Extract and deploy on server
            $deployCommands = @(
                "cd /var/www/filmflex",
                "tar -xzf /tmp/filmflex-deploy.tar.gz",
                "npm install --production",
                "npm run build",
                "chown -R www-data:www-data /var/www/filmflex",
                "chmod -R 755 /var/www/filmflex"
            )
            
            foreach ($cmd in $deployCommands) {
                Write-Log "Executing: $cmd" "Blue"
                try {
                    $result = Invoke-SSHCommand -Server $ServerIP -User $Username -Pass $Password -Command $cmd
                    Write-Log "✅ Deploy command completed" "Green"
                } catch {
                    Write-Log "⚠️ Deploy command warning: $($_.Exception.Message)" "Yellow"
                }
            }
        }
        
        # Clean up temp files
        Remove-Item $deployPackage -Force -ErrorAction SilentlyContinue
        Remove-Item $tempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Step 4: Configure environment
    if (-not $DataOnly) {
        Write-Log "⚙️ Step 4: Configuring environment..." "Yellow"
        
        $envConfig = @"
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
PGUSER=filmflex
PGPASSWORD=filmflex2024
PGDATABASE=filmflex
PGHOST=localhost
PGPORT=5432
SESSION_SECRET=filmflex_production_secret_$(Get-Random -Minimum 1000 -Maximum 9999)
"@
        
        # Create environment file on server
        $envCommands = @(
            "cat > /var/www/filmflex/.env << 'EOF'`n$envConfig`nEOF",
            "chmod 600 /var/www/filmflex/.env"
        )
        
        foreach ($cmd in $envCommands) {
            Write-Log "Executing: $cmd" "Blue"
            try {
                $result = Invoke-SSHCommand -Server $ServerIP -User $Username -Pass $Password -Command $cmd
                Write-Log "✅ Environment configured" "Green"
            } catch {
                Write-Log "⚠️ Environment config warning: $($_.Exception.Message)" "Yellow"
            }
        }
    }
    
    # Step 5: Configure Nginx
    if (-not $DataOnly) {
        Write-Log "🌐 Step 5: Configuring Nginx..." "Yellow"
        
        $nginxConfig = @"
server {
    listen 80;
    server_name $ServerIP;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    location /static/ {
        alias /var/www/filmflex/dist/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
"@
        
        $nginxCommands = @(
            "cat > /etc/nginx/sites-available/filmflex << 'EOF'`n$nginxConfig`nEOF",
            "ln -sf /etc/nginx/sites-available/filmflex /etc/nginx/sites-enabled/",
            "rm -f /etc/nginx/sites-enabled/default",
            "nginx -t",
            "systemctl restart nginx",
            "systemctl enable nginx"
        )
        
        foreach ($cmd in $nginxCommands) {
            Write-Log "Executing: $cmd" "Blue"
            try {
                $result = Invoke-SSHCommand -Server $ServerIP -User $Username -Pass $Password -Command $cmd
                Write-Log "✅ Nginx configured" "Green"
            } catch {
                Write-Log "⚠️ Nginx config warning: $($_.Exception.Message)" "Yellow"
            }
        }
    }
    
    # Step 6: Start application with PM2
    if (-not $DataOnly) {
        Write-Log "🚀 Step 6: Starting application..." "Yellow"
        
        $pm2Commands = @(
            "cd /var/www/filmflex",
            "pm2 stop filmflex || true",
            "pm2 delete filmflex || true",
            "pm2 start dist/index.js --name filmflex",
            "pm2 save",
            "pm2 startup",
            "pm2 logs filmflex --lines 10"
        )
        
        foreach ($cmd in $pm2Commands) {
            Write-Log "Executing: $cmd" "Blue"
            try {
                $result = Invoke-SSHCommand -Server $ServerIP -User $Username -Pass $Password -Command $cmd
                Write-Log "✅ PM2 command completed" "Green"
            } catch {
                Write-Log "⚠️ PM2 command warning: $($_.Exception.Message)" "Yellow"
            }
        }
    }
    
    # Step 7: Import movie data
    Write-Log "🎬 Step 7: Setting up movie data import..." "Yellow"
    
    $dataCommands = @(
        "cd /var/www/filmflex/scripts/data",
        "chmod +x *.sh",
        "./import-movies.sh --limit 100",
        "crontab -l | { cat; echo '0 2 * * * cd /var/www/filmflex/scripts/data && ./import-movies.sh >> /var/log/filmflex/cron-import.log 2>&1'; } | crontab -"
    )
    
    foreach ($cmd in $dataCommands) {
        Write-Log "Executing: $cmd" "Blue"
        try {
            $result = Invoke-SSHCommand -Server $ServerIP -User $Username -Pass $Password -Command $cmd
            Write-Log "✅ Data import setup completed" "Green"
        } catch {
            Write-Log "⚠️ Data import warning: $($_.Exception.Message)" "Yellow"
        }
    }
    
    # Step 8: Final verification
    Write-Log "🔍 Step 8: Verifying deployment..." "Yellow"
    
    $verifyCommands = @(
        "curl -f http://localhost:5000/api/health || echo 'Health check failed'",
        "pm2 status",
        "systemctl status nginx --no-pager",
        "systemctl status postgresql --no-pager",
        "df -h",
        "free -h"
    )
    
    foreach ($cmd in $verifyCommands) {
        Write-Log "Executing: $cmd" "Blue"
        try {
            $result = Invoke-SSHCommand -Server $ServerIP -User $Username -Pass $Password -Command $cmd
            Write-Log "Verification result: $result" "Blue"
        } catch {
            Write-Log "⚠️ Verification warning: $($_.Exception.Message)" "Yellow"
        }
    }
    
    Write-Log "🎉 Deployment completed!" "Green"
    Write-Log "🌐 Your FilmFlex application should be accessible at: http://$ServerIP" "Green"
    Write-Log "📊 Admin panel: http://$ServerIP/admin" "Green"
    Write-Log "📚 API documentation: http://$ServerIP/api" "Green"
    
    Write-Log "📋 Next steps:" "Yellow"
    Write-Log "1. Test the application in your browser" "Yellow"
    Write-Log "2. Monitor logs with: pm2 logs filmflex" "Yellow"
    Write-Log "3. Check data import progress in: /var/log/filmflex/" "Yellow"
    Write-Log "4. Configure domain name if needed" "Yellow"
}

# Start deployment
try {
    Start-Deployment
} catch {
    Write-Log "❌ Deployment failed: $($_.Exception.Message)" "Red"
    exit 1
}
