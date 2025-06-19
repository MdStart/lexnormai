'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient, LexNormSettings } from '@/lib/api';
import { Settings, Save, Plus, Edit, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<LexNormSettings[]>([]);
  const [countries, setCountries] = useState<{code: string; name: string}[]>([]);
  const [standards, setStandards] = useState<{code: string; name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    task_type: 'content_summary' as 'content_summary' | 'content_mapping',
    country: 'India',
    lexnorm_standard: 'NOS-National Occupational Standard',
    llm_model: 'gemini-2.5-pro',
    llm_prompt: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [settingsResponse, countriesResponse, standardsResponse] = await Promise.all([
        apiClient.settings.getAll(),
        apiClient.settings.getCountries(),
        apiClient.settings.getStandardTypes()
      ]);
      
      setSettings(settingsResponse.data);
      setCountries(countriesResponse.data);
      setStandards(standardsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.settings.update(editingId, formData);
      } else {
        await apiClient.settings.create(formData);
      }
      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleEdit = (setting: LexNormSettings) => {
    setFormData({
      task_type: setting.task_type,
      country: setting.country,
      lexnorm_standard: setting.lexnorm_standard,
      llm_model: setting.llm_model,
      llm_prompt: setting.llm_prompt
    });
    setEditingId(setting.id);
    setIsCreating(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this setting?')) {
      try {
        await apiClient.settings.delete(id);
        await loadData();
      } catch (error) {
        console.error('Error deleting setting:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      task_type: 'content_summary',
      country: 'India',
      lexnorm_standard: 'NOS-National Occupational Standard',
      llm_model: 'gemini-2.5-pro',
      llm_prompt: ''
    });
    setEditingId(null);
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
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
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">
            Configure your country and occupational standards preferences for AI content mapping.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Settings Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? 'Edit Settings' : 'Create New Settings'}
              </CardTitle>
              <CardDescription>
                Configure AI mapping parameters for course content analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="task_type">Task Type</Label>
                  <Select
                    value={formData.task_type}
                    onValueChange={(value: 'content_summary' | 'content_mapping') =>
                      setFormData({ ...formData, task_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="content_summary">Content Summary</SelectItem>
                      <SelectItem value="content_mapping">Content Mapping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) =>
                      setFormData({ ...formData, country: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lexnorm_standard">Occupational Standard</Label>
                  <Select
                    value={formData.lexnorm_standard}
                    onValueChange={(value) =>
                      setFormData({ ...formData, lexnorm_standard: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select standard" />
                    </SelectTrigger>
                    <SelectContent>
                      {standards.map((standard) => (
                        <SelectItem key={standard.code} value={standard.name}>
                          {standard.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="llm_model">LLM Model</Label>
                  <Input
                    id="llm_model"
                    value={formData.llm_model}
                    onChange={(e) =>
                      setFormData({ ...formData, llm_model: e.target.value })
                    }
                    placeholder="e.g., gemini-2.5-pro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="llm_prompt">Custom LLM Prompt (Optional)</Label>
                  <Textarea
                    id="llm_prompt"
                    value={formData.llm_prompt}
                    onChange={(e) =>
                      setFormData({ ...formData, llm_prompt: e.target.value })
                    }
                    placeholder="Enter custom prompt for AI analysis..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update Settings' : 'Create Settings'}
                  </Button>
                  {(isCreating || editingId) && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Existing Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Settings</CardTitle>
              <CardDescription>
                Manage your saved configuration settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No settings configured yet.</p>
                  <p className="text-sm">Create your first setting to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <div
                      key={setting.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {setting.task_type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary">{setting.country}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(setting)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(setting.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>Standard:</strong> {setting.lexnorm_standard}</p>
                        <p><strong>Model:</strong> {setting.llm_model}</p>
                        {setting.llm_prompt && (
                          <p><strong>Custom Prompt:</strong> {setting.llm_prompt.slice(0, 100)}...</p>
                        )}
                        <p className="text-gray-500">
                          Created: {new Date(setting.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 