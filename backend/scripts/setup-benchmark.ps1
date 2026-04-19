# Redis & MongoDB Benchmark - PowerShell Helper
# Run from backend folder: .\scripts\setup-benchmark.ps1

param(
    [ValidateSet('local', 'cloud', 'all', 'quick')]
    [string]$Scenario = 'quick'
)

# Color helpers
function Print-Header {
    Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║      REDIS & MONGODB BENCHMARK - PowerShell Helper         ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Print-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# Check Docker availability
function Check-Docker {
    try {
        $docker = docker --version 2>&1
        Print-Success "Docker is available: $docker"
        return $true
    }
    catch {
        Print-Error "Docker is not installed or not in PATH"
        Print-Info "Install from: https://docs.docker.com/desktop/install/windows/"
        return $false
    }
}

# Start Redis container
function Start-RedisContainer {
    Print-Info "Checking for existing Redis container..."
    
    try {
        $existing = docker ps -a --filter "name=redis-bench" --format "{{.Names}}" 2>&1
        if ($existing -eq "redis-bench") {
            Print-Info "Stopping existing redis-bench container..."
            docker stop redis-bench | Out-Null
            docker rm redis-bench | Out-Null
        }
    }
    catch {
        # Container might not exist, continue
    }

    Print-Info "Starting Redis container on port 6379..."
    try {
        docker run -d --name redis-bench -p 6379:6379 redis:7-alpine | Out-Null
        Start-Sleep -Seconds 2
        
        # Test connection
        $test = docker exec redis-bench redis-cli ping 2>&1
        if ($test -eq "PONG") {
            Print-Success "Redis is running and responding"
            return $true
        }
        else {
            Print-Error "Redis started but not responding"
            return $false
        }
    }
    catch {
        Print-Error "Failed to start Redis: $_"
        return $false
    }
}

# Stop Redis container
function Stop-RedisContainer {
    Print-Info "Cleaning up Redis container..."
    try {
        docker stop redis-bench | Out-Null
        docker rm redis-bench | Out-Null
        Print-Success "Redis container stopped and removed"
    }
    catch {
        Write-Host "⚠️  Could not stop container: $_" -ForegroundColor Yellow
    }
}

# Run the benchmark
function Run-Benchmark {
    Print-Info "Running benchmark..."
    Write-Host "`n" 
    
    try {
        npm run benchmark:redis
        Print-Success "Benchmark completed"
        return $true
    }
    catch {
        Print-Error "Benchmark failed: $_"
        return $false
    }
}

# View results
function View-Results {
    $logDir = "logs"
    if (Test-Path $logDir) {
        $latestLog = Get-ChildItem "$logDir\benchmark-*.txt" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestLog) {
            Write-Host "`n📄 Latest benchmark report:`n" -ForegroundColor Green
            Get-Content $latestLog.FullName
            Print-Info "Full path: $($latestLog.FullName)"
        }
    }
}

# Main execution
function Main {
    Print-Header

    # Check prerequisites
    if (-not (Check-Docker)) {
        exit 1
    }

    Write-Host "`nScenario: $Scenario`n"

    switch ($Scenario) {
        'local' {
            Print-Info "Running benchmark with LOCAL REDIS only"
            Print-Warning "Ensure REDIS_LOCAL_HOST and REDIS_LOCAL_PORT are in .env"
            
            if (Start-RedisContainer) {
                Run-Benchmark
                Stop-RedisContainer
                View-Results
            }
        }
        
        'cloud' {
            Print-Info "Running benchmark with REDIS CLOUD only"
            Print-Warning "Ensure REDIS_CLOUD_URL is set in .env"
            Run-Benchmark
            View-Results
        }
        
        'all' {
            Print-Info "Running benchmark with ALL THREE (Local, Cloud, MongoDB)"
            Print-Warning "Ensure .env has:"
            Print-Warning "  - REDIS_LOCAL_HOST/PORT"
            Print-Warning "  - REDIS_CLOUD_URL"
            Print-Warning "  - MONGODB_URL"
            
            if (Start-RedisContainer) {
                Run-Benchmark
                Stop-RedisContainer
                View-Results
            }
        }
        
        'quick' {
            Print-Info "Running benchmark (quick mode)"
            Print-Warning "Make sure .env is properly configured"
            Print-Warning "If using local Redis, ensure Docker container is running"
            
            $startRedis = Read-Host "Start Redis container? (y/n)"
            if ($startRedis -eq 'y' -or $startRedis -eq 'Y') {
                if (Start-RedisContainer) {
                    Run-Benchmark
                    
                    $stopRedis = Read-Host "`nStop Redis container? (y/n)"
                    if ($stopRedis -eq 'y' -or $stopRedis -eq 'Y') {
                        Stop-RedisContainer
                    }
                }
            }
            else {
                Run-Benchmark
            }
            
            View-Results
        }
    }

    Print-Success "Done!"
}

# Run main
Main
