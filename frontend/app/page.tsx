import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Upload, Zap, FileText } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            LexNormAI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered course content tagging system for occupational standards. 
            Map your educational content to relevant job roles and competency standards.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Settings</CardTitle>
              <CardDescription>
                Configure country and occupation standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings">
                <Button className="w-full">Configure Settings</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Upload Content</CardTitle>
              <CardDescription>
                Upload course materials and documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/upload">
                <Button className="w-full">Upload Content</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">AI Mapping</CardTitle>
              <CardDescription>
                Run AI analysis to map content to standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/mapping">
                <Button className="w-full">Start Mapping</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg">View Content</CardTitle>
              <CardDescription>
                Browse and manage uploaded content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/content">
                <Button className="w-full">View Content</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* How it Works Section */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            How LexNormAI Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Configure Settings</h3>
              <p className="text-gray-600">
                Select your country and preferred occupational standards 
                (default: India with NOS-National Occupational Standard)
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload Content</h3>
              <p className="text-gray-600">
                Upload your course materials, documents, or educational content 
                that needs to be mapped to occupational standards
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
              <p className="text-gray-600">
                Our AI analyzes your content, creates summaries, and maps it 
                to the most relevant job roles and competency standards
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
