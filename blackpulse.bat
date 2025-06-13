mode con: cols=100 lines=35

sc stop "SysMain" >nul 2>&1
sc config "SysMain" start=disabled

sc stop "WSearch" >nul 2>&1
sc config "WSearch" start=disabled

sc stop "DiagTrack" >nul 2>&1
sc config "DiagTrack" start=disabled

sc stop "Fax" >nul 2>&1
sc config "Fax" start=disabled

sc stop "Spooler" >nul 2>&1
sc config "Spooler" start=disabled

del /f /s /q %temp%\* >nul 2>&1
del /f /s /q C:\Windows\Temp\* >nul 2>&1
del /f /s /q C:\Windows\Prefetch\* >nul 2>&1

del /f /s /q %localappdata%\Microsoft\Windows\Explorer\thumbcache_*.db >nul 2>&1

netsh int tcp set global autotuninglevel=normal

netsh int tcp set global fastopen=enabled

netsh int ipv4 set dynamicport tcp start=1024 num=65535
netsh int ipv4 set dynamicport udp start=1024 num=65535

netsh interface tcp set global rss=enabled
netsh int tcp set global chimney=enabled
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global congestionprovider=ctcp

reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpWindowSize /t REG_DWORD /d 64240 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v GlobalMaxTcpWindowSize /t REG_DWORD /d 64240 /f

netsh int tcp set global rss=enabled

netsh int tcp set global chimney=enabled

netsh int tcp set global netdma=enabled

netsh int tcp set global ecncapability=enabled

netsh interface tcp set global congestionprovider=ctcp

reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v KeepAliveTime /t REG_DWORD /d 30000 /f

ipconfig /flushdns

netsh int ip reset
