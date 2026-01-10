import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { uploadFile, processData, UploadResponse } from '../api';
import { cn } from '../utils';

interface UploadPageProps {
  onDataReady: (sessionId: string) => void;
}

export default function UploadPage({ onDataReady }: UploadPageProps) {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'mapping' | 'processing' | 'done'>('idle');
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadState('uploading');
    setError(null);

    try {
      const response = await uploadFile(file);
      setUploadData(response);
      setColumnMapping(response.detected);
      setUploadState('mapping');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload file');
      setUploadState('idle');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleProcess = async () => {
    if (!uploadData) return;

    // Validate required columns
    const required = ['date', 'product', 'quantity'];
    const missing = required.filter(r => !columnMapping[r]);

    if (missing.length > 0) {
      setError(`Please select columns for: ${missing.join(', ')}`);
      return;
    }

    setUploadState('processing');
    setError(null);

    try {
      await processData(uploadData.sessionId, columnMapping);
      setUploadState('done');
      setTimeout(() => {
        onDataReady(uploadData.sessionId);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process data');
      setUploadState('mapping');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo & Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/30 mb-4">
            <span className="text-3xl">💊</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PharmaInsight Pro</h1>
          <p className="text-gray-500">Transform your pharmacy sales data into actionable intelligence</p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-fade-in stagger-1">
          {uploadState === 'idle' && (
            <div className="p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload Your Sales Data</h2>
              <p className="text-sm text-gray-500 mb-6">Upload a CSV or Excel file exported from your POS system</p>

              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                )}
              >
                <input {...getInputProps()} />
                <CloudArrowUpIcon className={cn(
                  'w-12 h-12 mx-auto mb-4',
                  isDragActive ? 'text-teal-500' : 'text-gray-300'
                )} />
                <p className="text-gray-600 font-medium">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop your file here'}
                </p>
                <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                <p className="text-xs text-gray-400 mt-4">Supports CSV, XLSX, XLS</p>
              </div>
            </div>
          )}

          {uploadState === 'uploading' && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-teal-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Uploading file...</p>
            </div>
          )}

          {uploadState === 'mapping' && uploadData && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Map Your Columns</h2>
                  <p className="text-sm text-gray-500">{uploadData.rowCount.toLocaleString()} rows loaded</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { key: 'date', label: 'Date Column', required: true },
                  { key: 'product', label: 'Product Column', required: true },
                  { key: 'quantity', label: 'Quantity Column', required: true },
                  { key: 'price', label: 'Unit Price', required: false },
                  { key: 'total', label: 'Line Total', required: false },
                  { key: 'invoice_id', label: 'Invoice ID', required: false },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      value={columnMapping[field.key] || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value || null })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select column</option>
                      {uploadData.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={handleProcess}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40"
              >
                Process & Analyze
              </button>
            </div>
          )}

          {uploadState === 'processing' && (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-teal-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Processing data...</p>
              <p className="text-sm text-gray-400 mt-1">This may take a moment</p>
            </div>
          )}

          {uploadState === 'done' && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-900 font-semibold text-lg">Data Ready!</p>
              <p className="text-gray-500 mt-1">Redirecting to dashboard...</p>
            </div>
          )}
        </div>

        {/* Features */}
        {uploadState === 'idle' && (
          <div className="mt-8 grid grid-cols-3 gap-4 animate-fade-in stagger-2">
            {[
              { icon: '📊', title: 'Sales Dashboard', desc: 'KPIs & trends' },
              { icon: '📈', title: 'Forecasting', desc: 'Predict future sales' },
              { icon: '📦', title: 'Inventory', desc: 'Stock optimization' },
            ].map((feature) => (
              <div key={feature.title} className="bg-white/80 backdrop-blur rounded-xl p-4 text-center border border-gray-100">
                <span className="text-2xl">{feature.icon}</span>
                <p className="font-medium text-gray-900 mt-2 text-sm">{feature.title}</p>
                <p className="text-xs text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
