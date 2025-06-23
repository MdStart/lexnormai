'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient, CourseContent, LexNormSettings, LexNormStandard, ContentMappingResponse } from '@/lib/api';
import { Zap, FileText, Settings, Target, CheckCircle, AlertCircle, Eye, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

  const exportResults = () => {
    if (!mappingResults) return;

    const csvContent = [
      ['Job Role', 'NOS Code', 'NOS Name', 'PC Code', 'PC Description'],
      ...mappingResults.mapped_standards.map(standard => [
        standard.job_role,
        standard.nos_code,
        standard.nos_name,
        standard.pc_code,
        standard.pc_description
      ])
    ].map(row => row.map(cell => `&quot;${cell}&quot;`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapping_results_${selectedContent?.title.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportResults}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
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
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="results">Mapping Results</TabsTrigger>
                      <TabsTrigger value="summary">Content Summary</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="results" className="space-y-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-medium">Mapping Complete</span>
                        </div>
                        {mappingResults.confidence_score && (
                          <Badge variant="outline">
                            Confidence: {mappingResults.confidence_score.toFixed(1)}%
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
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mappingResults.mapped_standards.map((standard, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {standard.job_role}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{standard.nos_code}</Badge>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div className="truncate" title={standard.nos_name}>
                                    {standard.nos_name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{standard.pc_code}</Badge>
                                </TableCell>
                                <TableCell className="max-w-md">
                                  <div className="text-sm text-gray-600">
                                    {standard.pc_description.length > 150
                                      ? standard.pc_description.substring(0, 150) + '...'
                                      : standard.pc_description}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
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
                  <Button onClick={exportResults}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
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