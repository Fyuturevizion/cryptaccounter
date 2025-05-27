import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface CsvFile {
  name: string;
  size: number;
  created: string;
  modified: string;
}

export function CsvDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: csvFiles, isLoading } = useQuery<CsvFile[]>({
    queryKey: ["/api/export/csv-files"],
  });

  const handleDownload = async (filename: string) => {
    setDownloading(filename);
    try {
      const response = await fetch(`/api/export/csv/${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CSV Files
          </CardTitle>
          <CardDescription>
            Loading available CSV files...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          CSV Files
        </CardTitle>
        <CardDescription>
          Download the generated transaction CSV files from your wallet imports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!csvFiles || csvFiles.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No CSV files available. Import wallet data to generate CSV files.
          </p>
        ) : (
          <div className="space-y-3">
            {csvFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-4">
                    <span>Size: {formatFileSize(file.size)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(file.modified)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(file.name)}
                  disabled={downloading === file.name}
                  size="sm"
                  className="ml-3"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading === file.name ? "Downloading..." : "Download"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}