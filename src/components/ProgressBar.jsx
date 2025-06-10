import { useForm } from './FormContext'

export default function ProgressBar() {
  const { currentStep, totalSteps, sections } = useForm()
  
  const progressPercentage = Math.round(((currentStep + 1) / totalSteps) * 100)
  
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="max-w-6xl mx-auto">
        {/* Header avec pourcentage */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Étape {currentStep + 1} sur {totalSteps}
          </div>
          <div className="text-sm font-medium text-gray-900">
            {progressPercentage}% complété
          </div>
        </div>
        
        {/* Barre de progression */}
        <div className="relative">
          {/* Ligne de fond */}
          <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-gray-200 rounded-full"></div>
          
          {/* Ligne de progression */}
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 h-0.5 bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
          
          {/* Points des étapes */}
          <div className="relative flex justify-between">
            {sections.map((section, index) => {
              const isCompleted = index < currentStep
              const isCurrent = index === currentStep
              const isUpcoming = index > currentStep
              
              let dotClasses = "w-3 h-3 rounded-full border-2 transition-all duration-200 "
              
              if (isCompleted) {
                dotClasses += "bg-primary border-primary"
              } else if (isCurrent) {
                dotClasses += "bg-white border-primary ring-2 ring-primary ring-opacity-30"
              } else {
                dotClasses += "bg-white border-gray-300"
              }
              
              return (
                <div key={section} className="relative group">
                  <div className={dotClasses}></div>
                  
                  {/* Tooltip au hover */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {section}
                    </div>
                    {/* Flèche du tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Section actuelle */}
        <div className="mt-3 text-center">
          <span className="text-sm font-medium text-gray-900">
            {sections[currentStep]}
          </span>
        </div>
      </div>
    </div>
  )
}