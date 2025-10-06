import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-solana p-1">
          <div className="bg-background rounded-3xl p-12 md:p-16 text-center space-y-8">
            <div className="space-y-4">
              <h2 className="font-space-grotesk text-4xl md:text-5xl font-bold">
                Ready to start trading <span className="gradient-text">without risk</span>?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of traders practicing with Sol Sim. No credit card required.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/trade">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
                >
                  Start Trading Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                  View Documentation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
