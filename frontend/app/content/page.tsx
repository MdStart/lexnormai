'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiClient, CourseContent, MappingResult } from '@/lib/api';
import { FileText, Search, Eye, Zap, Trash2, Plus, Calendar, AlertCircle, Download, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';

export default function ContentPage() {
  const router = useRouter();
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [filteredContents, setFilteredContents] = useState<CourseContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContent, setSelectedContent] = useState<CourseContent | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<number | null>(null);
  const [mappingResults, setMappingResults] = useState<Record<number, MappingResult[]>>({});
  const [loadingMappingResults, setLoadingMappingResults] = useState<Record<number, boolean>>({});

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

  const loadMappingResults = async (contentId: number) => {
    try {
      setLoadingMappingResults(prev => ({ ...prev, [contentId]: true }));
      const response = await apiClient.mapping.getResults(0, 100, contentId);
      setMappingResults(prev => ({ ...prev, [contentId]: response.data }));
    } catch (error) {
      console.error('Error loading mapping results:', error);
    } finally {
      setLoadingMappingResults(prev => ({ ...prev, [contentId]: false }));
    }
  };

  const exportMappingResults = (content: CourseContent, mappingResult: MappingResult, format: string) => {
    const mappingData = mappingResult.mapping_data;
    
    if (format === 'csv') {
      // CSV export with PC code level data
      const csvContent = [
        ['Job Role', 'NOS Code', 'NOS Name', 'PC Code', 'PC Description', 'Confidence Score', 'Reasoning', 'Gap Analysis'],
        ...mappingData.mapped_standards.map(detail => [
          detail.standard.job_role,
          detail.standard.nos_code,
          detail.standard.nos_name,
          detail.standard.pc_code,
          detail.standard.pc_description,
          detail.confidence_score.toString(),
          detail.reasoning,
          detail.gap_analysis || ''
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mapping_results_${content.title.replace(/[^a-z0-9]/gi, '_')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // PDF export with ALL mapping data using jsPDF
      const doc = new jsPDF();
      
      // Set font and title
      doc.setFontSize(16);
      doc.text('CONTENT MAPPING RESULTS', 20, 20);
      
      // Draw a line under title
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);
      
      let yPosition = 35;
      
      // Content information
      doc.setFontSize(12);
      doc.text(`Content: ${content.title}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Overall Confidence: ${mappingData.overall_confidence_score?.toFixed(1) || 'N/A'}%`, 20, yPosition);
      yPosition += 10;
      doc.text(`Standards Found: ${mappingData.mapped_standards.length}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Generated: ${new Date(mappingResult.created_at).toLocaleString()}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Job Role Filter: ${mappingResult.job_role_filter || 'None'}`, 20, yPosition);
      yPosition += 20;
      
      // Detailed mapping results
      doc.setFontSize(14);
      doc.text('DETAILED MAPPING RESULTS', 20, yPosition);
      doc.line(20, yPosition + 3, 120, yPosition + 3);
      yPosition += 15;
      
      mappingData.mapped_standards.forEach((detail, index) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.text(`${index + 1}. ${detail.standard.job_role}`, 20, yPosition);
        yPosition += 8;
        
        doc.setFontSize(10);
        doc.text(`NOS Code: ${detail.standard.nos_code}`, 25, yPosition);
        yPosition += 6;
        doc.text(`NOS Name: ${detail.standard.nos_name}`, 25, yPosition);
        yPosition += 6;
        doc.text(`PC Code: ${detail.standard.pc_code}`, 25, yPosition);
        yPosition += 6;
        
        // Handle long PC descriptions
        const pcDesc = detail.standard.pc_description;
        const splitDesc = doc.splitTextToSize(pcDesc, 160);
        doc.text(`PC Description: ${splitDesc[0]}`, 25, yPosition);
        yPosition += 6;
        if (splitDesc.length > 1) {
          for (let i = 1; i < splitDesc.length; i++) {
            doc.text(splitDesc[i], 25, yPosition);
            yPosition += 6;
          }
        }
        
        doc.text(`Confidence Score: ${detail.confidence_score}%`, 25, yPosition);
        yPosition += 6;
        
        // Handle long reasoning text
        const reasoning = detail.reasoning;
        const splitReasoning = doc.splitTextToSize(`Reasoning: ${reasoning}`, 160);
        for (let i = 0; i < splitReasoning.length; i++) {
          doc.text(splitReasoning[i], 25, yPosition);
          yPosition += 6;
        }
        
        if (detail.gap_analysis) {
          const gapAnalysis = detail.gap_analysis;
          const splitGap = doc.splitTextToSize(`Gap Analysis: ${gapAnalysis}`, 160);
          for (let i = 0; i < splitGap.length; i++) {
            doc.text(splitGap[i], 25, yPosition);
            yPosition += 6;
          }
        }
        
        yPosition += 5; // Space between entries
      });
      
      // Overall gap analysis
      if (mappingData.overall_gap_analysis) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('OVERALL GAP ANALYSIS', 20, yPosition);
        doc.line(20, yPosition + 3, 110, yPosition + 3);
        yPosition += 15;
        
        doc.setFontSize(10);
        const splitOverallGap = doc.splitTextToSize(mappingData.overall_gap_analysis, 160);
        for (let i = 0; i < splitOverallGap.length; i++) {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(splitOverallGap[i], 20, yPosition);
          yPosition += 6;
        }
        yPosition += 10;
      }
      
      // Content summary
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text('CONTENT SUMMARY USED FOR MAPPING', 20, yPosition);
      doc.line(20, yPosition + 3, 140, yPosition + 3);
      yPosition += 15;
      
      doc.setFontSize(10);
      const splitSummary = doc.splitTextToSize(mappingData.summary_used, 160);
      for (let i = 0; i < splitSummary.length; i++) {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(splitSummary[i], 20, yPosition);
        yPosition += 6;
      }
      
      // Save the PDF
      doc.save(`mapping_results_${content.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
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
                      <TableHead className="w-48">Title</TableHead>
                      <TableHead className="w-96">Content Preview</TableHead>
                      <TableHead className="w-32">Summary Status</TableHead>
                      <TableHead className="w-32">Mapping Results</TableHead>
                      <TableHead className="w-40">Created</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
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
                          <div className="text-sm text-gray-600 line-clamp-2">
                            {truncateText(content.content, 100)}
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
                        <TableCell>
                          {content.summary ? (
                            <div className="flex items-center gap-2">
                              {mappingResults[content.id] && mappingResults[content.id].length > 0 ? (
                                <Badge variant="default" className="bg-purple-100 text-purple-800">
                                  {mappingResults[content.id].length} Results
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => loadMappingResults(content.id)}
                                  disabled={loadingMappingResults[content.id]}
                                  title="Load Mapping Results"
                                >
                                  {loadingMappingResults[content.id] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                  ) : (
                                    <Target className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">
                              No Summary
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span className="whitespace-nowrap">{formatDate(content.created_at)}</span>
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
                                  onClick={() => {
                                    setSelectedContent(content);
                                    if (content.summary && !mappingResults[content.id]) {
                                      loadMappingResults(content.id);
                                    }
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[95vw] h-[85vh] max-w-none max-h-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none overflow-hidden flex flex-col m-2">
                                <DialogHeader className="flex-shrink-0 pb-4 border-b">
                                  <DialogTitle className="text-xl font-bold">{selectedContent?.title}</DialogTitle>
                                  <DialogDescription className="text-sm text-gray-600">
                                    Content details, AI summary, and mapping analysis results
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex-1 overflow-y-auto py-4">
                                  {selectedContent && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                      {/* Left Column - Content & Summary */}
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="font-semibold mb-2">Original Content</h4>
                                          <div className="bg-gray-50 p-4 rounded-lg h-48 overflow-y-auto">
                                            <div className="whitespace-pre-wrap text-sm break-words leading-relaxed">
                                              {selectedContent.content}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {selectedContent.summary && (
                                          <div>
                                            <h4 className="font-semibold mb-2">AI Summary</h4>
                                            <div className="bg-blue-50 p-4 rounded-lg h-32 overflow-y-auto">
                                              <div className="whitespace-pre-wrap text-sm break-words leading-relaxed">
                                                {selectedContent.summary}
                                              </div>
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
                                      
                                      {/* Right Column - Mapping Results */}
                                      <div className="space-y-4">
                                        {selectedContent.summary && (
                                          <div>
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-semibold">Mapping Results</h4>
                                              {!mappingResults[selectedContent.id] && (
                                                <Button
                                                  size="sm"
                                                  onClick={() => loadMappingResults(selectedContent.id)}
                                                  disabled={loadingMappingResults[selectedContent.id]}
                                                  className="flex items-center gap-2"
                                                >
                                                  {loadingMappingResults[selectedContent.id] ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                  ) : (
                                                    <Target className="w-4 h-4" />
                                                  )}
                                                  Load Mapping Results
                                                </Button>
                                              )}
                                            </div>
                                            
                                            {loadingMappingResults[selectedContent.id] && (
                                              <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                                                <p className="text-sm text-gray-600">Loading mapping results...</p>
                                              </div>
                                            )}
                                            
                                            {mappingResults[selectedContent.id] && mappingResults[selectedContent.id].length > 0 ? (
                                              <div className="space-y-4">
                                                {mappingResults[selectedContent.id].map((result, index) => (
                                                  <div key={result.id} className="border rounded-lg p-4 bg-purple-50">
                                                    <div className="flex items-center justify-between mb-3">
                                                      <div className="flex items-center gap-2">
                                                        <Badge variant="outline">
                                                          Result #{index + 1}
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                          {result.standards_count} Standards
                                                        </Badge>
                                                        {result.overall_confidence_score && (
                                                          <Badge variant="outline" className="text-green-700 border-green-300">
                                                            {result.overall_confidence_score}% Confidence
                                                          </Badge>
                                                        )}
                                                        {result.job_role_filter && (
                                                          <Badge variant="outline" className="text-purple-700 border-purple-300">
                                                            {result.job_role_filter}
                                                          </Badge>
                                                        )}
                                                      </div>
                                                      <div className="flex gap-1">
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={() => exportMappingResults(selectedContent, result, 'csv')}
                                                          title="Export CSV"
                                                          className="h-7 px-2 text-xs"
                                                        >
                                                          <Download className="w-3 h-3 mr-1" />
                                                          CSV
                                                        </Button>
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={() => exportMappingResults(selectedContent, result, 'pdf')}
                                                          title="Export PDF"
                                                          className="h-7 px-2 text-xs"
                                                        >
                                                          <Download className="w-3 h-3 mr-1" />
                                                          PDF
                                                        </Button>
                                                      </div>
                                                    </div>
                                                    
                                                    <div className="text-xs text-gray-500 mb-3">
                                                      Generated: {new Date(result.created_at).toLocaleString()}
                                                    </div>
                                                    
                                                    <div className="max-h-80 overflow-y-auto border rounded-lg">
                                                      <Table>
                                                        <TableHeader>
                                                          <TableRow>
                                                            <TableHead className="text-sm w-32">Job Role</TableHead>
                                                            <TableHead className="text-sm w-28">NOS Code</TableHead>
                                                            <TableHead className="text-sm w-24">PC Code</TableHead>
                                                            <TableHead className="text-sm w-24">Confidence</TableHead>
                                                            <TableHead className="text-sm">Reasoning</TableHead>
                                                          </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                          {result.mapping_data.mapped_standards.map((detail, detailIndex) => (
                                                            <TableRow key={detailIndex}>
                                                              <TableCell className="text-sm font-medium w-32">
                                                                <div className="break-words leading-normal">
                                                                  {detail.standard.job_role}
                                                                </div>
                                                              </TableCell>
                                                              <TableCell className="text-sm w-28">
                                                                <Badge variant="outline" className="text-sm whitespace-nowrap">
                                                                  {detail.standard.nos_code}
                                                                </Badge>
                                                              </TableCell>
                                                              <TableCell className="text-sm w-24">
                                                                <Badge variant="secondary" className="text-sm whitespace-nowrap">
                                                                  {detail.standard.pc_code}
                                                                </Badge>
                                                              </TableCell>
                                                              <TableCell className="text-sm w-24">
                                                                <Badge variant="outline" className="text-green-700 border-green-300 text-sm whitespace-nowrap">
                                                                  {detail.confidence_score}%
                                                                </Badge>
                                                              </TableCell>
                                                              <TableCell className="text-sm">
                                                                <div className="break-words leading-normal" title={detail.reasoning}>
                                                                  {detail.reasoning}
                                                                </div>
                                                              </TableCell>
                                                            </TableRow>
                                                          ))}
                                                        </TableBody>
                                                      </Table>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : mappingResults[selectedContent.id] && mappingResults[selectedContent.id].length === 0 ? (
                                              <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm text-gray-600">No mapping results found for this content.</p>
                                              </div>
                                            ) : null}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
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