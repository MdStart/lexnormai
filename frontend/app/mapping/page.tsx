'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient, CourseContent, LexNormSettings, LexNormStandard, ContentMappingResponse, MappedStandardDetail } from '@/lib/api';
import { Zap, FileText, Settings, Target, CheckCircle, AlertCircle, Eye, Download, Filter, X, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';

export default function MappingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedContentId = searchParams.get('content');

  const [contents, setContents] = useState<CourseContent[]>([]);
  const [settings, setSettings] = useState<LexNormSettings[]>([]);
  const [jobRoles, setJobRoles] = useState<{job_role: string}[]>([]);
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [selectedSettingsId, setSelectedSettingsId] = useState<string>('');
  const [selectedJobRoleFilter, setSelectedJobRoleFilter] = useState<string>('all');
  const [isMapping, setIsMapping] = useState(false);
  const [mappingResults, setMappingResults] = useState<ContentMappingResponse | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [contentsResponse, settingsResponse, jobRolesResponse] = await Promise.all([
        apiClient.content.getAll(),
        apiClient.settings.getAll(),
        apiClient.mapping.getJobRoles()
      ]);
      
      // Filter to only content with summaries
      const contentsWithSummary = contentsResponse.data.filter(c => c.summary);
      setContents(contentsWithSummary);
      setSettings(settingsResponse.data);
      setJobRoles(jobRolesResponse.data);

      // Set preselected content if provided
      if (preselectedContentId && contentsWithSummary.find(c => c.id.toString() === preselectedContentId)) {
        setSelectedContentId(preselectedContentId);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [preselectedContentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMapping = async () => {
    if (!selectedContentId) {
      setMappingError('Please select content to map');
      return;
    }

    try {
      setIsMapping(true);
      setMappingError(null);
      setMappingResults(null);

      const response = await apiClient.mapping.mapContent({
        content_id: parseInt(selectedContentId),
        settings_id: selectedSettingsId ? parseInt(selectedSettingsId) : undefined,
        job_role_filter: selectedJobRoleFilter && selectedJobRoleFilter !== 'all' ? selectedJobRoleFilter : undefined
      });

      setMappingResults(response.data);
    } catch {
      setMappingError('Error mapping content to standards');
    } finally {
      setIsMapping(false);
    }
  };

  const selectedContent = contents.find(c => c.id.toString() === selectedContentId);
  const selectedSettings = settings.find(s => s.id.toString() === selectedSettingsId);

  const exportResults = (format: string) => {
    if (!mappingResults) return;

    if (format === 'csv') {
      // Only PC code level data - no overall statistics
      const csvContent = [
        ['Job Role', 'NOS Code', 'NOS Name', 'PC Code', 'PC Description', 'Confidence Score', 'Reasoning', 'Gap Analysis'],
        ...mappingResults.mapped_standards.map(detail => [
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
      a.download = `mapping_results_${selectedContent?.title.replace(/[^a-z0-9]/gi, '_')}.csv`;
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
      doc.text(`Content: ${selectedContent?.title || 'Unknown'}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Overall Confidence: ${mappingResults.overall_confidence_score?.toFixed(1) || 'N/A'}%`, 20, yPosition);
      yPosition += 10;
      doc.text(`Standards Found: ${mappingResults.mapped_standards.length}`, 20, yPosition);
      yPosition += 10;
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
      yPosition += 20;
      
      // Detailed mapping results
      doc.setFontSize(14);
      doc.text('DETAILED MAPPING RESULTS', 20, yPosition);
      doc.line(20, yPosition + 3, 120, yPosition + 3);
      yPosition += 15;
      
      mappingResults.mapped_standards.forEach((detail, index) => {
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
      if (mappingResults.overall_gap_analysis) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('OVERALL GAP ANALYSIS', 20, yPosition);
        doc.line(20, yPosition + 3, 110, yPosition + 3);
        yPosition += 15;
        
        doc.setFontSize(10);
        const splitOverallGap = doc.splitTextToSize(mappingResults.overall_gap_analysis, 160);
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
      
      // Save the PDF
      doc.save(`mapping_results_${selectedContent?.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading mapping interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Content Mapping</h1>
          </div>
          <p className="text-gray-600">
            Map your course content to relevant occupational standards using AI analysis.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Mapping Configuration
                </CardTitle>
                <CardDescription>
                  Select content and settings for AI mapping analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Content</label>
                  <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose content to map" />
                    </SelectTrigger>
                    <SelectContent>
                      {contents.map((content) => (
                        <SelectItem key={content.id} value={content.id.toString()}>
                          {content.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {contents.length === 0 && (
                    <p className="text-sm text-orange-600">
                      No content with summaries available. Generate summaries first.
                    </p>
                  )}
                </div>

                {/* Settings Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Settings (Optional)</label>
                  <Select value={selectedSettingsId} onValueChange={setSelectedSettingsId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Use default settings" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.map((setting) => (
                        <SelectItem key={setting.id} value={setting.id.toString()}>
                          {setting.country} - {setting.lexnorm_standard}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Leave empty to use default settings (India, NOS)
                  </p>
                </div>

                {/* Job Role Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Role Filter (Optional)</label>
                  <Select value={selectedJobRoleFilter} onValueChange={setSelectedJobRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by job role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Job Roles</SelectItem>
                      {jobRoles.map((role, index) => (
                        <SelectItem key={index} value={role.job_role}>
                          {role.job_role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Filter mapping results to specific job roles only
                  </p>
                </div>

                {/* Selected Content Preview */}
                {selectedContent && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selected Content</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-sm">{selectedContent.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Summary available • Created {new Date(selectedContent.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Selected Settings Preview */}
                {selectedSettings && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selected Settings</label>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex gap-2 mb-2">
                        <Badge variant="outline">{selectedSettings.task_type}</Badge>
                        <Badge variant="secondary">{selectedSettings.country}</Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        {selectedSettings.lexnorm_standard} • {selectedSettings.llm_model}
                      </p>
                    </div>
                  </div>
                )}

                {/* Job Role Filter Preview */}
                {selectedJobRoleFilter && selectedJobRoleFilter !== 'all' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Active Job Role Filter</label>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-purple-700 border-purple-300">
                          {selectedJobRoleFilter}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJobRoleFilter('all')}
                          className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700"
                        >
                          Clear
                        </Button>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">
                        Only standards for this job role will be considered
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {mappingError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{mappingError}</span>
                  </div>
                )}

                {/* Mapping Button */}
                <Button
                  onClick={handleMapping}
                  disabled={isMapping || !selectedContentId}
                  className="w-full flex items-center gap-2"
                >
                  {isMapping ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Target className="w-4 h-4" />
                  )}
                  {isMapping ? 'Mapping Content...' : 'Start AI Mapping'}
                </Button>

                {/* Quick Links */}
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm font-medium">Quick Actions</p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/content')}
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Content
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/settings')}
                      className="flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Configure Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <Card className="min-h-[600px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Mapping Results
                    </CardTitle>
                    <CardDescription>
                      AI-generated mapping of content to occupational standards.
                    </CardDescription>
                  </div>
                  {mappingResults && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportResults('csv')}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportResults('pdf')}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export PDF
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!mappingResults && !isMapping && (
                  <div className="text-center py-20 text-gray-500">
                    <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Ready for AI Mapping</h3>
                    <p className="mb-6">Select content and click "Start AI Mapping" to begin analysis.</p>
                  </div>
                )}

                {isMapping && (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium mb-2">AI Analysis in Progress</h3>
                    <p className="text-gray-600">Mapping content to occupational standards...</p>
                  </div>
                )}

                {mappingResults && (
                  <Tabs defaultValue="results" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="results">Mapping Results</TabsTrigger>
                      <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
                      <TabsTrigger value="summary">Content Summary</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="results" className="space-y-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium">Mapping Complete</span>
                        </div>
                        {mappingResults.overall_confidence_score && (
                          <Badge variant="outline">
                            Confidence: {mappingResults.overall_confidence_score.toFixed(1)}%
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {mappingResults.mapped_standards.length} Standards Found
                        </Badge>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Job Role</TableHead>
                              <TableHead>NOS Code</TableHead>
                              <TableHead>NOS Name</TableHead>
                              <TableHead>PC Code</TableHead>
                              <TableHead>PC Description</TableHead>
                              <TableHead>Confidence</TableHead>
                              <TableHead>Reasoning</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mappingResults.mapped_standards.map((detail, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {detail.standard.job_role}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{detail.standard.nos_code}</Badge>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div className="truncate" title={detail.standard.nos_name}>
                                    {detail.standard.nos_name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{detail.standard.pc_code}</Badge>
                                </TableCell>
                                <TableCell className="max-w-md">
                                  <div className="text-sm text-gray-600">
                                    {detail.standard.pc_description.length > 100
                                      ? detail.standard.pc_description.substring(0, 100) + '...'
                                      : detail.standard.pc_description}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-green-700 border-green-300">
                                    {detail.confidence_score}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-sm">
                                  <div className="text-sm text-gray-600">
                                    {detail.reasoning.length > 80
                                      ? detail.reasoning.substring(0, 80) + '...'
                                      : detail.reasoning}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Gap Analysis Section */}
                      {mappingResults.overall_gap_analysis && (
                        <div className="bg-orange-50 p-4 rounded-lg mt-4">
                          <h4 className="font-semibold mb-2 text-orange-800">Overall Gap Analysis</h4>
                          <div className="text-sm text-orange-700 whitespace-pre-wrap">
                            {mappingResults.overall_gap_analysis}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="gaps" className="space-y-4">
                      {/* Overall Gap Analysis */}
                      {mappingResults.overall_gap_analysis && (
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-orange-800">Overall Gap Analysis</h4>
                          <div className="text-sm text-orange-700 whitespace-pre-wrap">
                            {mappingResults.overall_gap_analysis}
                          </div>
                        </div>
                      )}

                      {/* Individual Gap Analysis */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800">Individual Standard Gaps</h4>
                        {mappingResults.mapped_standards.map((detail, index) => (
                          detail.gap_analysis && (
                            <div key={index} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <Badge variant="outline" className="mb-1">{detail.standard.nos_code}</Badge>
                                  <h5 className="font-medium text-sm text-gray-800">{detail.standard.nos_name}</h5>
                                </div>
                                <Badge variant="outline" className="text-green-700 border-green-300">
                                  {detail.confidence_score}%
                                </Badge>
                              </div>
                              <div className="text-sm text-yellow-800 mb-2">
                                <strong>Gap Analysis:</strong>
                              </div>
                              <div className="text-sm text-yellow-700 whitespace-pre-wrap">
                                {detail.gap_analysis}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                      
                      {!mappingResults.overall_gap_analysis && !mappingResults.mapped_standards.some(d => d.gap_analysis) && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No gap analysis available for this mapping.</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="summary" className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">AI-Generated Summary</h4>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {mappingResults.summary_used}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        This summary was used as the basis for mapping to occupational standards.
                      </p>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Next Steps */}
        {mappingResults && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                Your content has been successfully mapped to occupational standards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>
                    Found {mappingResults.mapped_standards.length} relevant occupational standards
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/content')}
                  >
                    Map More Content
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportResults('csv')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportResults('pdf')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 