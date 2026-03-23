import urllib.request
import zipfile
import os

url = "https://srtm.csi.cgiar.org/wp-content/uploads/files/srtm_5x5/TIFF/srtm_51_06.zip"
print(f"Downloading SRTM data from {url}...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    with urllib.request.urlopen(req) as response, open("srtm.zip", 'wb') as out_file:
        out_file.write(response.read())
    
    print("Extracting...")
    with zipfile.ZipFile("srtm.zip", 'r') as zip_ref:
        zip_ref.extractall(".")
    
    print("Success! Downloaded and extracted SRTM DEM.")
except Exception as e:
    print(f"Error downloading or extracting: {e}")
