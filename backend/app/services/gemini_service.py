import google.generativeai as genai
from typing import List, Dict, Any
from ..core.config import settings
from ..models.models import LexNormStandard, CourseContent, LexNormSettings
import json


class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-2.5-pro')

    async def generate_content_summary(self, content: str, custom_prompt: str = "") -> str:
        """Generate a comprehensive summary of course content."""
        
        base_prompt = """
        Please create a comprehensive summary of the following course content. 
        Focus on:
        1. Key learning objectives
        2. Main topics covered
        3. Skills and competencies addressed
        4. Target audience/level
        5. Practical applications
        
        Course Content:
        """
        
        final_prompt = custom_prompt if custom_prompt else base_prompt
        full_prompt = f"{final_prompt}\n\n{content}"
        print(f"Full prompt: {full_prompt}")
        try:
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            raise Exception(f"Error generating summary: {str(e)}")

    async def map_content_to_standards(
        self, 
        summary: str, 
        standards: List[LexNormStandard],
        custom_prompt: str = ""
    ) -> List[Dict[str, Any]]:
        """Map course content summary to relevant occupational standards."""
        
        # Prepare standards data for the prompt
        standards_text = ""
        for standard in standards:
            standards_text += f"""
Job Role: {standard.job_role}
NOS Code: {standard.nos_code}
NOS Name: {standard.nos_name}
PC Code: {standard.pc_code}
PC Description: {standard.pc_description}
---
"""
        
        base_prompt = f"""
        Based on the course content summary below, identify the most relevant occupational standards from the provided list.
        
        Instructions:
        1. Analyze the course content summary for skills, competencies, and learning outcomes
        2. Match these with the most relevant occupational standards
        3. Provide a confidence score (0-100) for each match
        4. Provide detailed reasoning for why each standard matches
        5. Include gap analysis for each mapping (what's missing or partially covered)
        6. Return only the top 10 most relevant matches
        7. At the end, provide an overall gap analysis summarizing what occupational standards are missing or not well covered
        8. Format the response as a JSON object with the following structure:
        {{
            "mappings": [
                {{
                    "job_role": "role_name",
                    "nos_code": "code",
                    "nos_name": "name",
                    "pc_code": "pc_code",
                    "pc_description": "description",
                    "confidence_score": 85,
                    "reasoning": "detailed explanation of why this standard matches the course content",
                    "gap_analysis": "explanation of what aspects are missing or only partially covered"
                }}
            ],
            "overall_gap_analysis": "comprehensive analysis of what occupational competencies are missing from the course content and recommendations for improvement"
        }}
        
        Course Content Summary:
        {summary}
        
        Available Occupational Standards:
        {standards_text}
        
        Please provide only the JSON response without any additional text or markdown formatting.
        """
        
        final_prompt = custom_prompt if custom_prompt else base_prompt
        
        try:
            print(f"Final prompt: {final_prompt}")
            response = self.model.generate_content(final_prompt)
            print(f"Raw Gemini response: {response.text}")
            
            # Clean up the response text
            response_text = response.text.strip()
            
            # Remove any markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]  # Remove ```json
            if response_text.startswith('```'):
                response_text = response_text[3:]  # Remove ```
            if response_text.endswith('```'):
                response_text = response_text[:-3]  # Remove trailing ```
            
            response_text = response_text.strip()
            print(f"Cleaned response text: {response_text}")
            
            # Parse the JSON response
            result = json.loads(response_text)
            print(f"Parsed JSON result: {result}")
            
            # Handle both old and new response formats
            if isinstance(result, list):
                # Old format - return as is for backward compatibility
                return result
            elif isinstance(result, dict) and "mappings" in result:
                # New format - extract mappings and include overall gap analysis
                mappings = result.get("mappings", [])
                overall_gap = result.get("overall_gap_analysis", "")
                
                # Add overall gap analysis to each mapping for now (we'll handle it in the API layer)
                for mapping in mappings:
                    mapping["overall_gap_analysis"] = overall_gap
                
                return mappings
            else:
                # Unknown format
                print(f"Unknown response format: {result}")
                return []
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Failed to parse response: {response.text}")
            # If JSON parsing fails, return a fallback response
            return []
        except Exception as e:
            print(f"General error in map_content_to_standards: {e}")
            raise Exception(f"Error mapping content to standards: {str(e)}")

    async def generate_custom_prompt(self, task_type: str, context: str = "") -> str:
        """Generate a custom prompt based on task type and context."""
        
        prompts = {
            "content_summary": """
            Create a detailed summary focusing on educational content, learning objectives, 
            and skill development aspects. Include key topics, competencies, and practical applications.
            """,
            "content_mapping": """
            Analyze the content for occupational relevance and map it to appropriate job roles, 
            skills, and competency standards. Focus on practical applications and industry alignment.
            """
        }
        
        base_prompt = prompts.get(task_type, prompts["content_summary"])
        
        if context:
            base_prompt += f"\n\nAdditional Context: {context}"
        
        return base_prompt


# Initialize the service
gemini_service = GeminiService() 