'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiClient, CourseContent } from '@/lib/api';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<CourseContent | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    file: null as File | null
  });
  const [dragActive, setDragActive] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const handleFileSelect = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setUploadError('File size must be less than 10MB');
      return;
    }

    const allowedTypes = ['text/plain', 'application/pdf', 'text/markdown'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only text (.txt), PDF (.pdf), and Markdown (.md) files are supported');
      return;
    }

    setFormData({ ...formData, file });
    
    // Preview content for text files
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      try {
        const text = await file.text();
        setPreviewContent(text);
      } catch (error) {
        console.error('Error reading file:', error);
      }
    } else if (file.type === 'application/pdf') {
      setPreviewContent('PDF content will be extracted during upload processing.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    
    if (!formData.title.trim()) {
      setUploadError('Please provide a title for the content');
      return;
    }

    if (!formData.file && !formData.content.trim()) {
      setUploadError('Please either upload a file or enter content manually');
      return;
    }

    try {
      setIsUploading(true);
      
      let response;
      if (formData.file) {
        // Upload file
        response = await apiClient.content.upload(formData.file, formData.title);
      } else {
        // Create content manually
        response = await apiClient.content.create({
          title: formData.title,
          content: formData.content
        });
      }

      setUploadSuccess(response.data);
      resetForm();
    } catch {
      setUploadError('Error uploading content');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      file: null
    });
    setPreviewContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = () => {
    setFormData({ ...formData, file: null });
    setPreviewContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Upload Course Content</h1>
          </div>
          <p className="text-gray-600">
            Upload your course materials, documents, or educational content for AI analysis and mapping.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle>Course Content Upload</CardTitle>
              <CardDescription>
                Upload files or enter content manually for AI analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title Input */}
                <div className="space-y-2">
                  <Label htmlFor="title">Content Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter a descriptive title for your content"
                    required
                  />
                </div>

                {/* File Upload Area */}
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {formData.file ? (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-600" />
                          <div className="text-left">
                            <p className="font-medium">{formData.file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={removeFile}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="font-medium">Drop your file here, or click to browse</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Supports: Text (.txt), PDF (.pdf), Markdown (.md)
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Maximum file size: 10MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose File
                        </Button>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".txt,.pdf,.md"
                    onChange={handleFileInput}
                  />
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="text-sm text-gray-500 bg-white px-3">OR</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Manual Content Input */}
                <div className="space-y-2">
                  <Label htmlFor="content">Enter Content Manually</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Paste or type your course content here..."
                    rows={8}
                    disabled={!!formData.file}
                  />
                  {formData.file && (
                    <p className="text-sm text-gray-500">
                      Manual content input is disabled when a file is selected.
                    </p>
                  )}
                </div>

                {/* Error Display */}
                {uploadError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Success Display */}
                {uploadSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>Content uploaded successfully!</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isUploading}
                    className="flex items-center gap-2"
                  >
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {isUploading ? 'Uploading...' : 'Upload Content'}
                  </Button>
                  
                  {uploadSuccess && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/content')}
                    >
                      View All Content
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Content Preview</CardTitle>
              <CardDescription>
                Preview of your content before upload.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewContent || formData.content ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {formData.file ? 'File Content' : 'Manual Content'}
                    </Badge>
                    {formData.file && (
                      <Badge variant="secondary">
                        {formData.file.type}
                      </Badge>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">
                      {previewContent || formData.content}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500">
                    Showing preview of content that will be uploaded and analyzed.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No content to preview yet.</p>
                  <p className="text-sm">Upload a file or enter content manually to see preview.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 