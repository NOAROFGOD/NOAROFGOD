@echo off
echo กำลังรีเซ็ตค่า Registry บางส่วนให้เป็นค่าเริ่มต้น...

:: ForegroundLockTimeout (ปกติคือ 200000 ms)
reg add "HKCU\Control Panel\Desktop" /v ForegroundLockTimeout /t REG_DWORD /d 200000 /f

:: MenuShowDelay (ปกติคือ 400 ms)
reg add "HKCU\Control Panel\Desktop" /v MenuShowDelay /t REG_SZ /d 400 /f

:: MinAnimate (เปิดแอนิเมชัน = 1)
reg add "HKCU\Control Panel\Desktop\WindowMetrics" /v MinAnimate /t REG_SZ /d 1 /f

:: VisualFXSetting (ปกติคือ 1 = ปรับอัตโนมัติ)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 1 /f

:: SysMain (Superfetch) เปิดใช้งาน (ค่า 2)
reg add "HKLM\SYSTEM\CurrentControlSet\Services\SysMain" /v Start /t REG_DWORD /d 2 /f
sc config SysMain start=auto
sc start SysMain

:: WSearch เปิดอัตโนมัติ (ค่า 2)
sc config WSearch start=auto
sc start WSearch

:: DiagTrack เปิดอัตโนมัติ (ค่า 3 = Manual)
sc config DiagTrack start=manual
sc start DiagTrack

:: Fax เปิดอัตโนมัติ (ค่า 3 = Manual)
sc config Fax start=manual
sc start Fax

:: Spooler เปิดอัตโนมัติ (ค่า 2)
sc config Spooler start=auto
sc start Spooler

:: Windows Defender Real-time Protection เปิดใช้งาน
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableRealtimeMonitoring /t REG_DWORD /d 0 /f

:: GPU Threaded Optimization ปิด (0)
reg add "HKLM\SOFTWARE\NVIDIA Corporation\Global\NvThreadedOptimization" /v Enable /t REG_DWORD /d 0 /f

:: GPU V-Sync บังคับ เปิด (1)
reg add "HKLM\SOFTWARE\NVIDIA Corporation\Global\SyncToVBlank" /v Enable /t REG_DWORD /d 1 /f

:: GPUPriority คืนค่า Default (4)
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v GPUPriority /t REG_DWORD /d 4 /f

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
