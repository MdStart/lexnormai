'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiClient, CourseContent } from '@/lib/api';
import { FileText, Search, Eye, Zap, Trash2, Plus, Calendar, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ContentPage() {
  const router = useRouter();
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [filteredContents, setFilteredContents] = useState<CourseContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContent, setSelectedContent] = useState<CourseContent | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<number | null>(null);

  useEffect(() => {
    loadContents();
  }, []);

  useEffect(() => {
    // Filter contents based on search term
    const filtered = contents.filter(content =>
      content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredContents(filtered);
  }, [contents, searchTerm]);

  const loadContents = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.content.getAll();
      setContents(response.data);
    } catch (error) {
      console.error('Error loading contents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async (contentId: number) => {
    try {
      setIsGeneratingSummary(contentId);
      await apiClient.content.generateSummary(contentId);
      await loadContents(); // Reload to get updated summary
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGeneratingSummary(null);
    }
  };

  const handleDeleteContent = async (contentId: number) => {
    if (confirm('Are you sure you want to delete this content?')) {
      try {
        await apiClient.content.delete(contentId);
        await loadContents();
      } catch (error) {
        console.error('Error deleting content:', error);
      }
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-orange-600" />
              <h1 className="text-3xl font-bold text-gray-900">Course Content</h1>
            </div>
            <Button onClick={() => router.push('/upload')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Upload New Content
            </Button>
          </div>
          <p className="text-gray-600">
            Manage your uploaded course content and generate AI summaries for mapping analysis.
          </p>
        </div>

        {/* Search and Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search content by title or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{contents.length}</div>
              <div className="text-sm text-gray-600">Total Content</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {contents.filter(c => c.summary).length}
              </div>
              <div className="text-sm text-gray-600">With Summary</div>
            </CardContent>
          </Card>
        </div>

        {/* Content Table */}
        <Card>
          <CardHeader>
            <CardTitle>Content Library</CardTitle>
            <CardDescription>
              All your uploaded course content with analysis status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredContents.length === 0 ? (
              <div className="text-center py-12">
                {contents.length === 0 ? (
                  <div className="text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No content uploaded yet</h3>
                    <p className="mb-6">Start by uploading your first course content for AI analysis.</p>
                    <Button onClick={() => router.push('/upload')}>
                      Upload Your First Content
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No content matches your search</h3>
                    <p>Try adjusting your search terms.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Content Preview</TableHead>
                      <TableHead>Summary Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContents.map((content) => (
                      <TableRow key={content.id}>
                        <TableCell className="font-medium max-w-xs">
                          <div className="truncate" title={content.title}>
                            {content.title}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-sm text-gray-600">
                            {truncateText(content.content, 150)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {content.summary ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Summary Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              No Summary
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(content.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* View Details */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedContent(content)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>{selectedContent?.title}</DialogTitle>
                                  <DialogDescription>
                                    Content details and analysis information
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedContent && (
                                  <div className="space-y-6">
                                    <div>
                                      <h4 className="font-semibold mb-2">Original Content</h4>
                                      <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                                        <pre className="whitespace-pre-wrap text-sm">
                                          {selectedContent.content}
                                        </pre>
                                      </div>
                                    </div>
                                    
                                    {selectedContent.summary && (
                                      <div>
                                        <h4 className="font-semibold mb-2">AI Summary</h4>
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                          <pre className="whitespace-pre-wrap text-sm">
                                            {selectedContent.summary}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="flex gap-2">
                                      {!selectedContent.summary && (
                                        <Button
                                          onClick={() => handleGenerateSummary(selectedContent.id)}
                                          disabled={isGeneratingSummary === selectedContent.id}
                                          className="flex items-center gap-2"
                                        >
                                          {isGeneratingSummary === selectedContent.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                          ) : (
                                            <Zap className="w-4 h-4" />
                                          )}
                                          Generate Summary
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        onClick={() => router.push(`/mapping?content=${selectedContent.id}`)}
                                      >
                                        Map to Standards
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            {/* Generate Summary */}
                            {!content.summary && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleGenerateSummary(content.id)}
                                disabled={isGeneratingSummary === content.id}
                                title="Generate AI Summary"
                              >
                                {isGeneratingSummary === content.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                ) : (
                                  <Zap className="w-4 h-4" />
                                )}
                              </Button>
                            )}

                            {/* Delete */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteContent(content.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete Content"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        {contents.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                Ready to map your content to occupational standards?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    Content with summaries can be mapped to occupational standards using AI
                  </span>
                </div>
                <Button
                  onClick={() => router.push('/mapping')}
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Start AI Mapping
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 