import os


from crewai import LLM
from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai_tools import (
	ExaSearchTool,
	JinaScrapeWebsiteTool,
	ArxivPaperTool
)






@CrewBase
class CyclecareDocumentationCrewCrew:
    """CyclecareDocumentationCrew crew"""

    
    @agent
    def senior_product_manager(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["senior_product_manager"],
            
            
            tools=[				ExaSearchTool()],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def business_market_research_analyst(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["business_market_research_analyst"],
            
            
            tools=[				ExaSearchTool(),
				JinaScrapeWebsiteTool()],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def reproductive_health_research_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["reproductive_health_research_specialist"],
            
            
            tools=[				ExaSearchTool(),
				ArxivPaperTool()],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def data_science_prediction_systems_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["data_science_prediction_systems_specialist"],
            
            
            tools=[				ExaSearchTool()],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def senior_software_cloud_architect(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["senior_software_cloud_architect"],
            
            
            tools=[],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def database_design_specialist(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["database_design_specialist"],
            
            
            tools=[],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def application_security_privacy_engineer(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["application_security_privacy_engineer"],
            
            
            tools=[				ExaSearchTool()],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def senior_ux_ui_designer(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["senior_ux_ui_designer"],
            
            
            tools=[],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def flutter_mobile_lead_developer(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["flutter_mobile_lead_developer"],
            
            
            tools=[],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def nestjs_backend_lead_developer(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["nestjs_backend_lead_developer"],
            
            
            tools=[],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def startup_strategy_growth_advisor(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["startup_strategy_growth_advisor"],
            
            
            tools=[				ExaSearchTool()],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def qa_test_strategy_engineer(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["qa_test_strategy_engineer"],
            
            
            tools=[],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    
    @agent
    def technical_project_director(self) -> Agent:
        
        
        return Agent(
            config=self.agents_config["technical_project_director"],
            
            
            tools=[],
            
            reasoning=False,
            max_reasoning_attempts=None,
            inject_date=True,
            allow_delegation=False,
            max_iter=25,
            max_rpm=None,
            
            
            max_execution_time=None,
            llm=LLM(
                model="openai/gpt-4o-mini",
                
                
            ),
            
        )
        
    

    
    @task
    def product_requirements_task(self) -> Task:
        return Task(
            config=self.tasks_config["product_requirements_task"],
            markdown=False,
            
            
        )
    
    @task
    def architecture_task(self) -> Task:
        return Task(
            config=self.tasks_config["architecture_task"],
            markdown=False,
            
            
        )
    
    @task
    def market_research_task(self) -> Task:
        return Task(
            config=self.tasks_config["market_research_task"],
            markdown=False,
            
            
        )
    
    @task
    def medical_research_task(self) -> Task:
        return Task(
            config=self.tasks_config["medical_research_task"],
            markdown=False,
            
            
        )
    
    @task
    def prediction_engine_task(self) -> Task:
        return Task(
            config=self.tasks_config["prediction_engine_task"],
            markdown=False,
            
            
        )
    
    @task
    def database_schema_task(self) -> Task:
        return Task(
            config=self.tasks_config["database_schema_task"],
            markdown=False,
            
            
        )
    
    @task
    def security_task(self) -> Task:
        return Task(
            config=self.tasks_config["security_task"],
            markdown=False,
            
            
        )
    
    @task
    def ux_design_task(self) -> Task:
        return Task(
            config=self.tasks_config["ux_design_task"],
            markdown=False,
            
            
        )
    
    @task
    def flutter_structure_task(self) -> Task:
        return Task(
            config=self.tasks_config["flutter_structure_task"],
            markdown=False,
            
            
        )
    
    @task
    def api_design_task(self) -> Task:
        return Task(
            config=self.tasks_config["api_design_task"],
            markdown=False,
            
            
        )
    
    @task
    def startup_strategy_task(self) -> Task:
        return Task(
            config=self.tasks_config["startup_strategy_task"],
            markdown=False,
            
            
        )
    
    @task
    def qa_strategy_task(self) -> Task:
        return Task(
            config=self.tasks_config["qa_strategy_task"],
            markdown=False,
            
            
        )
    
    @task
    def executive_summary_task(self) -> Task:
        return Task(
            config=self.tasks_config["executive_summary_task"],
            markdown=False,
            
            
        )
    

    @crew
    def crew(self) -> Crew:
        """Creates the CyclecareDocumentationCrew crew"""

        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,  # Automatically created by the @task decorator
            process=Process.sequential,
            verbose=True,

            chat_llm=LLM(model="openai/gpt-4o-mini"),
        )


