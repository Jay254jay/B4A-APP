import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Capacitor } from "@capacitor/core"
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem"
import { Share } from "@capacitor/share"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function saveOrDownloadCSV(filename: string, content: string) {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform()
    const isAndroid = platform === "android"
    const path = isAndroid ? `Download/${filename}` : filename
    const directory = isAndroid ? Directory.ExternalStorage : Directory.Documents
    const result = await Filesystem.writeFile({
      path,
      data: content,
      directory,
      encoding: Encoding.UTF8,
      recursive: false,
    })
    const url = result.uri || ""
    try {
      await Share.share({
        title: filename,
        url,
      })
    } catch {}
    return
  }
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
