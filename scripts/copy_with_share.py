import glob
import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)

GENERIC_READ = 0x80000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
FILE_SHARE_DELETE = 0x00000004
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

CreateFileW = kernel32.CreateFileW
CreateFileW.argtypes = [
    wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
    wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE
]
CreateFileW.restype = wintypes.HANDLE

ReadFile = kernel32.ReadFile
ReadFile.argtypes = [
    wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID
]
ReadFile.restype = wintypes.BOOL

CloseHandle = kernel32.CloseHandle
CloseHandle.argtypes = [wintypes.HANDLE]
CloseHandle.restype = wintypes.BOOL

src_files = sorted(glob.glob(r'C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\Sessions\Session_*'))
if not src_files:
    print("No session files found")
    exit(0)

src = src_files[-1]
print("Opening:", src)

handle = CreateFileW(
    src,
    GENERIC_READ,
    FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
    None,
    OPEN_EXISTING,
    FILE_ATTRIBUTE_NORMAL,
    None
)

if handle == -1 or handle == 0xFFFFFFFFFFFFFFFF:
    err = ctypes.get_last_error()
    print("Failed to open file, error code:", err)
    exit(1)

buffer_size = 10 * 1024 * 1024 # 10MB
buf = ctypes.create_string_buffer(buffer_size)
bytes_read = wintypes.DWORD()

success = ReadFile(handle, buf, buffer_size, ctypes.byref(bytes_read), None)
CloseHandle(handle)

if not success:
    err = ctypes.get_last_error()
    print("Failed to read file, error code:", err)
    exit(1)

data = buf.raw[:bytes_read.value]
print("Successfully read bytes:", len(data))

# Extract URLs
import re
urls = re.findall(rb'https?://[a-zA-Z0-9.-]+(?:/[^\s\x00-\x1f\x7f-\xff]*)?', data)
unique_urls = sorted(list(set(urls)))
for u in unique_urls:
    s = u.decode('latin1', errors='ignore')
    if any(k in s for k in ['cloud.google', 'supabase', 'jandarpan', 'client', 'oauth']):
        print(s[:160])
