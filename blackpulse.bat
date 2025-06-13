mode con: cols=100 lines=35
reg add "HKCU\Control Panel\Desktop" /v ForegroundLockTimeout /t REG_DWORD /d 0 /f
reg add "HKCU\Control Panel\Desktop" /v MenuShowDelay /t REG_SZ /d 0 /f
reg add "HKCU\Control Panel\Desktop\WindowMetrics" /v MinAnimate /t REG_SZ /d 0 /f
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f

reg add "HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\be337238-0d82-4146-a960-4f3749d470c7" /v Attributes /t REG_DWORD /d 2 /f
powercfg -setactive SCHEME_MIN

reg add "HKLM\SYSTEM\CurrentControlSet\Services\SysMain" /v Start /t REG_DWORD /d 4 /f
sc stop SysMain >nul 2>&1

sc stop "WSearch" >nul 2>&1
sc config "WSearch" start=disabled >nul 2>&1
sc stop "DiagTrack" >nul 2>&1
sc config "DiagTrack" start=disabled >nul 2>&1
sc stop "Fax" >nul 2>&1
sc config "Fax" start=disabled >nul 2>&1

reg add "HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\0cc5b647-c1df-4637-891a-dec35c318583" /v ValueMax /t REG_DWORD /d 0 /f

powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMAX 100
powercfg -setactive SCHEME_CURRENT

:: GPU Boost (ลด Latency เพิ่มประสิทธิภาพ GPU)
echo ปรับแต่ง GPU Registry...
:: เปิดใช้ Threaded Optimization (ดีสำหรับหลายเกม NVIDIA)
reg add "HKLM\SOFTWARE\NVIDIA Corporation\Global\NvThreadedOptimization" /v Enable /t REG_DWORD /d 1 /f

:: ปิด GPU V-Sync บังคับ (ถ้ามี) ลด Lag Input
reg add "HKLM\SOFTWARE\NVIDIA Corporation\Global\SyncToVBlank" /v Enable /t REG_DWORD /d 0 /f

:: เพิ่ม GPU Priority ให้สูงขึ้น
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" /v GPUPriority /t REG_DWORD /d 8 /f
:: 1. ล้างไฟล์ขยะใน Temp
echo ล้างไฟล์ Temp...
del /f /s /q "%temp%\*" >nul 2>&1
del /f /s /q "C:\Windows\Temp\*" >nul 2>&1

:: 2. ล้าง Prefetch เพื่อเคลียร์แคชโปรแกรมเก่า
echo ล้าง Prefetch...
del /f /q /s C:\Windows\Prefetch\* >nul 2>&1

:: 3. ปิดบริการที่กินทรัพยากรไม่จำเป็น (อย่าปิดถ้ารู้สึกเครื่องใช้บริการเหล่านี้)
echo ปิดบริการที่ไม่จำเป็น...
sc stop "SysMain" >nul 2>&1
sc config "SysMain" start=disabled >nul 2>&1

sc stop "WSearch" >nul 2>&1
sc config "WSearch" start=disabled >nul 2>&1

sc stop "DiagTrack" >nul 2>&1
sc config "DiagTrack" start=disabled >nul 2>&1

sc stop "Fax" >nul 2>&1
sc config "Fax" start=disabled >nul 2>&1

sc stop "Spooler" >nul 2>&1
sc config "Spooler" start=disabled >nul 2>&1

:: 4. ปิด Windows Defender Real-time Protection (ถ้าต้องการบูสต์สุดๆ)
echo ปิด Windows Defender Real-time Protection...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableRealtimeMonitoring /t REG_DWORD /d 1 /f >nul 2>&1

:: 5. ตั้งค่า Registry ให้ Boost FPS (เพิ่ม Priority Process เล่นเกม)
echo เพิ่มประสิทธิภาพการรันโปรแกรมเกม...
reg add "HKCU\Control Panel\Desktop" /v "ForegroundLockTimeout" /t REG_DWORD /d 0 /f >nul 2>&1

:: 6. ปิดแอนิเมชัน Windows ช่วยเพิ่มความเร็ว
echo ปิดแอนิเมชัน Windows...
reg add "HKCU\Control Panel\Desktop\WindowMetrics" /v MinAnimate /t REG_SZ /d 0 /f >nul 2>&1

:: 7. เคลียร์ DNS Cache
echo เคลียร์ DNS Cache...
ipconfig /flushdns >nul 2>&1

:: 8. เคลียร์ ARP Cache
echo เคลียร์ ARP Cache...
netsh interface ip delete arpcache >nul 2>&1

:: 9. Optimize Network - Disable Nagle's Algorithm (เพิ่มความเร็วเน็ตนิดๆ)
echo ตั้งค่า Network Optimization...
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" /v TcpAckFrequency /t REG_DWORD /d 1 /f >nul 2>&1

reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" /v LetAppsRunInBackground /t REG_DWORD /d 2 /f

netsh int tcp set global autotuninglevel=normal

reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" /v LargeSystemCache /t REG_DWORD /d 1 /f

netsh int tcp set global fastopen=enabled

reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" /v TcpWindowSize /t REG_DWORD /d 131072 /f

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

netsh int ip reset
