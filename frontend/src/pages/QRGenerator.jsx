import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

export default function QRGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.restaurantId) {
      fetchTables();
    }
  }, [user]);

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/tables?restaurantId=${user.restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data);
      if (data.length > 0) {
        setSelectedTable(data[0]);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tables',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate QR code URL (change this to your production domain)
  const baseUrl = window.location.origin;
  const qrUrl = selectedTable ? `${baseUrl}/menu/${selectedTable.id}` : '';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'QR code URL copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `table-${selectedTable?.number || 'unknown'}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      
      toast({
        title: 'Downloaded!',
        description: `QR code for Table ${selectedTable?.number || ''} saved`,
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">QR Code Generator</h1>
          <p className="text-muted-foreground">
            Generate QR codes for your restaurant tables
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tables...</p>
          </div>
        ) : tables.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No tables found. Please create tables first in Table Management.</p>
                <Button onClick={() => window.location.href = '/tables'}>
                  Go to Table Management
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Configuration Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Configure QR Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="table">Select Table</Label>
                    <Select
                      value={selectedTable?.id}
                      onValueChange={(value) => {
                        const table = tables.find(t => t.id === value);
                        setSelectedTable(table);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a table" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            Table {table.number} - {table.capacity || 4} seats
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Generated URL</Label>
                    <div className="flex gap-2">
                      <Input value={qrUrl} readOnly className="flex-1" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyUrl}
                        disabled={!selectedTable}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                <p className="text-xs text-muted-foreground">
                  Customers will scan this QR code to access the menu
                </p>
              </div>

              <div className="pt-4 space-y-2">
                <h3 className="font-semibold">How to use:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Enter the table number</li>
                  <li>Download the QR code</li>
                  <li>Print and place on the table</li>
                  <li>Customers scan to view menu and order</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Display */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">QR Code Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="p-6 bg-white rounded-lg shadow-sm">
                  {selectedTable && (
                    <QRCodeSVG
                      id="qr-code"
                      value={qrUrl}
                      size={256}
                      level="H"
                      includeMargin={true}
                    />
                  )}
                </div>
                
                <div className="text-center">
                  <p className="font-semibold text-lg">Table {selectedTable?.number || '-'}</p>
                  <p className="text-sm text-muted-foreground">Scan to view menu</p>
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleDownloadQR}
                  disabled={!selectedTable}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Table Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Quick Table Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Click a table to quickly generate its QR code:
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
              {tables.map((table) => (
                <Button
                  key={table.id}
                  variant={selectedTable?.id === table.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTable(table)}
                  className="h-16 flex flex-col"
                >
                  <span className="text-lg font-bold">{table.number}</span>
                  <span className="text-xs">{table.capacity || 4} seats</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
