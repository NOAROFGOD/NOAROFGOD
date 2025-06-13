mode con: cols=100 lines=35

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb runAs"
    exit /b
)

netsh int tcp set global autotuninglevel=normal

netsh int tcp set global fastopen=enabled

netsh int ipv4 set dynamicport tcp start=1024 num=65535
netsh int ipv4 set dynamicport udp start=1024 num=65535

netsh interface tcp set global rss=enabled
netsh int tcp set global chimney=enabled
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global congestionprovider=ctcp

netsh int tcp set global rss=enabled

netsh int tcp set global chimney=enabled

netsh int tcp set global netdma=enabled

netsh int tcp set global ecncapability=enabled

netsh interface tcp set global congestionprovider=ctcp

ipconfig /flushdns

netsh int ip reset
