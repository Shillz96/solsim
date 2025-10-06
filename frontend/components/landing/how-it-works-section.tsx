import { UserPlus, Search, TrendingUp, BarChart2 } from "lucide-react"

const steps = [
  {
    icon: UserPlus,
    title: "Sign up & connect",
    description: "Create your account and get 100 SOL virtual balance instantly.",
  },
  {
    icon: Search,
    title: "Explore trending tokens",
    description: "Browse real-time trending tokens from Birdeye and Pump.fun.",
  },
  {
    icon: TrendingUp,
    title: "Place paper trades",
    description: "Buy and sell tokens with virtual SOL. Practice without risk.",
  },
  {
    icon: BarChart2,
    title: "Track & compete",
    description: "Monitor your portfolio and climb the leaderboard rankings.",
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="font-space-grotesk text-4xl md:text-5xl font-bold">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes. No wallet connection required.
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-solana opacity-30" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 relative">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Step number */}
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-gradient-solana flex items-center justify-center glow-primary">
                      <step.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-space-grotesk text-xl font-bold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
