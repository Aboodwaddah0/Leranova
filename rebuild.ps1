Write-Host "Rebuilding Learnova backend with latest code..." -ForegroundColor Cyan

# Stop and remove the old api container
docker-compose stop api
docker-compose rm -f api

# Remove the old image so Docker is forced to rebuild from scratch
docker rmi learnova-api -f 2>$null

# Rebuild the image with the latest code and restart
docker-compose up --build -d api

Write-Host ""
Write-Host "Done! Backend is restarting with your latest code." -ForegroundColor Green
Write-Host "Check logs with: docker logs -f learnova-api" -ForegroundColor Yellow
