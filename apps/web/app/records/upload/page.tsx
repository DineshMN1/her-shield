'use client';

import { useState } from 'react';
import { Upload, ArrowLeft, FileText, X, Loader } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const SCAN_TYPES = [
  'Ultrasound',
  'Blood Test',
  'Urine Test',
  'X-Ray',
  'MRI',
  'CT Scan',
  'ECG',
  'Other',
];

export default function UploadScanPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    scanType: '',
    scanDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(selectedFile));
      } else {
        setPreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    const token = localStorage.getItem('token');

    try {
      // First upload the file
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: uploadFormData,
        }
      );

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadData = await uploadRes.json();

      // Then save the scan record
      const scanRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/medical-records/scans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: formData.title,
            scanType: formData.scanType,
            fileUrl: uploadData.fileUrl,
            fileType: file.type,
            notes: formData.notes,
            scanDate: formData.scanDate,
          }),
        }
      );

      if (scanRes.ok) {
        toast.success('Scan uploaded successfully!');
        router.push('/records');
      } else {
        throw new Error('Failed to save scan');
      }
    } catch (error) {
      toast.error('Failed to upload scan');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/records">
              <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-gray-900 cursor-pointer" />
            </Link>
            <h1>Upload Scan/Report</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File (Image or PDF)
            </label>
            {file ? (
              <div className="relative bg-gray-50 rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
                >
                  <X className="w-4 h-4" />
                </button>
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="flex items-center space-x-3">
                    <FileText className="w-12 h-12 text-red-500" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-pink-400 transition-colors">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">Click to upload or drag & drop</p>
                <p className="text-sm text-gray-400 mt-1">
                  JPG, PNG, PDF up to 10MB
                </p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-field"
              placeholder="e.g., Blood Test Report - January"
            />
          </div>

          {/* Scan Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type of Report
            </label>
            <select
              required
              value={formData.scanType}
              onChange={(e) =>
                setFormData({ ...formData, scanType: e.target.value })
              }
              className="input-field"
            >
              <option value="">Select type</option>
              {SCAN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Scan Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Date
            </label>
            <input
              type="date"
              required
              value={formData.scanDate}
              onChange={(e) =>
                setFormData({ ...formData, scanDate: e.target.value })
              }
              className="input-field"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="input-field resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={uploading || !file}
            className="btn-primary w-full flex items-center justify-center"
          >
            {uploading ? (
              <Loader className="animate-spin h-5 w-5" />
            ) : (
              'Upload Scan'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
