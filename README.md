# Introduction

It provides the following functions

1. Express RESTFUL API service
2. Socket connection
3. TCP connection to MCS .NET service
4. RabbitMQ client for fetching messages from RabbitMQ queues
5. Logging (application log / audit log / error log)
6. Database connection
7. Clustering
8. Secuirty checking
9. support Pm2 hosting on Linux server

## start PM2

# Generate Startup Script. Dont use ROOT to run

pm2 startup

systemctl enable pm2-mcs
pm2 start npm --name "MCS_API_01" -- run start

# Freeze your process list across server restart

pm2 save

## kill process
