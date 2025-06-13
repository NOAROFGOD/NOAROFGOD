sc config "SysMain" start=auto
sc start "SysMain"

sc config "WSearch" start=auto
sc start "WSearch"

sc config "DiagTrack" start=auto
sc start "DiagTrack"

sc config "Fax" start=manual
sc start "Fax"

sc config "Spooler" start=auto
sc start "Spooler"

:: รีเซ็ต TCP/IP stack คืนค่า network settings
netsh int ip reset

:: รีเซ็ต TCP global parameters เป็น default
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global fastopen=disabled
netsh int tcp set global rss=disabled
netsh int tcp set global chimney=disabled
netsh int tcp set global netdma=disabled
netsh int tcp set global ecncapability=disabled
netsh int tcp set global congestionprovider=none

:: รีเซ็ต dynamic port range เป็น default
netsh int ipv4 reset dynamicport tcp
netsh int ipv4 reset dynamicport udp

:: ลบค่า registry ที่ตั้งเอง (ตั้งค่า 0 คือปิด หรือ ลบค่า)
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpWindowSize /f
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v GlobalMaxTcpWindowSize /f
reg delete "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v KeepAliveTime /f

:: ล้าง DNS cache
ipconfig /flushdns
