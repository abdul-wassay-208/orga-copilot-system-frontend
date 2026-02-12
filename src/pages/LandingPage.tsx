import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Compass, 
  Sprout, 
  Users, 
  Heart, 
  Building2, 
  GraduationCap,
  Lightbulb,
  Target,
  Brain
} from 'lucide-react';
import { Navigation } from '@/components/landing/Navigation';
import { GradientButton } from '@/components/landing/GradientButton';
import { FeatureCard } from '@/components/landing/FeatureCard';
import { BackgroundBlobs } from '@/components/landing/BackgroundBlobs';

export default function LandingPage() {
  const navigate = useNavigate();
  
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7 }
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-6">
        <BackgroundBlobs />
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-gray-900 leading-[1.15] tracking-tight"
          >
            Your team is smarter than your org chart thinks.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            The Evo Associates AI assistant helps you see your team as the living system it is – and find what it needs to thrive.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col items-center gap-6"
          >
            <GradientButton 
              size="lg" 
              showArrow
              onClick={() => navigate('/login')}
            >
              Start a Conversation
            </GradientButton>
            <div className="flex items-center gap-4 text-gray-500">
              <button onClick={() => navigate('/signup')} className="hover:text-gray-700 transition-colors">Sign up</button>
              <span>•</span>
              <button onClick={() => navigate('/login')} className="hover:text-gray-700 transition-colors">Log in</button>
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-12 text-gray-500 max-w-2xl mx-auto"
          >
            No jargon. No generic advice. Just a better way to think about your toughest team challenges.
          </motion.p>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-gradient-to-br from-[#FEBE40]/20 to-transparent blur-3xl" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.h2
            {...fadeInUp}
            className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center leading-[1.2] tracking-tight"
          >
            You've read the leadership books. You've done the training. Why does your team still struggle?
          </motion.h2>
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-6 text-lg text-gray-600 leading-relaxed"
          >
            <p>
            Most leadership advice starts with the same assumption: if you develop the right
            individual – the right leader, the right hire, the right high-performer – the team will follow.
            </p>
            <p>
            But you've seen it yourself. Talented people who can't seem to collaborate. A great
team that fell apart when one person left. A culture that no initiative seems to change.
Conflicts that keep resurfacing no matter how many times you address them.
            </p>
            <p>
            The problem isn't your people. It's how you've been taught to think about teams.
            </p>
          
          </motion.div>
        </div>
      </section>

      {/* The Reframe Section */}
      <section className="relative py-32 px-6">
        <BackgroundBlobs />
        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.h2
            {...fadeInUp}
            className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 leading-[1.2] tracking-tight"
          >
            What if your team is a <span className="bg-gradient-to-r from-[#FEBE40] to-[#E40B7B] bg-clip-text text-transparent">living system</span> – not a machine to be fixed?
          </motion.h2>
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-6 text-lg text-gray-600 leading-relaxed"
          >
            <p>
            Complexity science has spent decades studying how living systems work – from
ecosystems to neural networks to cities. The patterns are remarkably consistent:
collective behavior emerges from interactions, not from commands. Small changes can
cascade into major shifts. And the most adaptive systems aren't the ones with the
strongest leaders – they're the ones with the healthiest dynamics.
            
            </p>
            <p>
            The Quantum Teams AI assistant applies these insights to the challenges you face
every day. It helps you see the patterns you've been missing, ask better questions, and
find where small shifts can make the biggest difference.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FEBE40] via-[#E40B7B] to-[#FEBE40]" />

      {/* How It Works Section */}
      <section className="relative py-32 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-[1.2] tracking-tight">
              A thinking partner, not a playbook.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            This isn't a chatbot that spits out generic management tips. It's an AI assistant grounded
in complexity science concepts adapted specifically for team dynamics – the same
framework behind the book Quantum Teams and the premise behind the TEDx
Princeton talk &quot;Teams Need Leadership, Not Leaders.&quot;
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Eye}
              title="See what's really happening"
              description="Describe your team challenge and get a fresh
perspective. The assistant helps you look past symptoms to the interaction patterns,
feedback loops, and hidden dynamics that are actually driving your team's behavior."
              index={0}
            />
            <FeatureCard
              icon={Compass}
              title="Prepare for important moments"
              description="Walking into a tough conversation? Navigating a
team transition? Planning a change initiative? Think it through with an assistant that
helps you anticipate how living systems actually respond – not how org charts say they
should."
              index={1}
            />
            <FeatureCard
              icon={Sprout}
              title="Build better conditions"
              description="Get practical guidance on creating the conditions where your
team can do its best work – from how information flows, to how decisions get made, to
how your team adapts under pressure."
              index={2}
            />
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="relative py-32 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            {...fadeInUp}
            className="text-4xl md:text-5xl font-bold mb-20 text-gray-900 text-center leading-[1.2] tracking-tight"
          >
            Built for the people who actually make teams work.
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Users, title: "Team leads and managers", description: "You're in the middle of it every day. Use the assistant to think through recurring challenges, prepare for conversations, and experiment with new approaches." },
              { icon: Heart, title: "HR and organizational development professionals", description: "You're responsible for team efectiveness at scale. Use the assistant to explore team dynamics through a systems lens and develop more nuanced interventions." },
              { icon: Building2, title: "Executives and senior leaders", description: "You set the conditions for dozens or hundreds of teams. Use the assistant to understand why some thrive and others don't – and what you can actually influence." },
              { icon: GraduationCap, title: "Coaches and consultants", description: "You help others navigate team challenges. Use the assistant to deepen your diagnostic toolkit and explore complexity-informed approaches with your clients." }
            ].map((profile, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FEBE40]/20 to-[#E40B7B]/20 flex items-center justify-center mx-auto mb-6">
                  <profile.icon className="w-10 h-10 text-[#E40B7B]" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{profile.title}</h3>
                <p className="text-gray-600">{profile.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes It Different Section */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            {...fadeInUp}
            className="text-4xl md:text-5xl font-bold mb-20 text-gray-900 text-center leading-[1.2] tracking-tight"
          >
            This isn't another leadership chatbot.
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Lightbulb}
              title="Grounded in science, not platitudes"
              description="Every response draws from established
complexity science principles adapted for organizational contexts. This isn't motivational
advice – it's a fundamentally different way of understanding how teams work.."
              index={0}
            />
            <FeatureCard
              icon={Target}
              title="Challenges your assumptions"
              description="Most tools tell you what you want to hear. This one
helps you question the assumptions that might be keeping your team stuck – starting
with the idea that teams succeed or fail because of individual leaders."
              index={1}
            />
            <FeatureCard
              icon={Brain}
              title="Meets you where you are"
              description="Whether you're new to complexity thinking or deeply familiar
with it, the assistant adapts. Bring a specific situation, a general question, or just
curiosity. It meets you where you are and helps you see further."
              index={2}
            />
          </div>
        </div>
      </section>

      {/* Credibility / About Section */}
      <section className="relative py-32 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            {...fadeInUp}
            className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center leading-[1.2] tracking-tight"
          >
            The thinking behind the thinking partner.
          </motion.h2>
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-6 text-lg text-gray-600 leading-relaxed"
          >
            <p>
            The Evo AI assistant is built on the research and frameworks developed by Dr. Michael
Morand – military veteran, Fortune 50 strategist, organizational researcher, and author
of Quantum Teams.
            </p>
            <p>
            Drawing on two decades of leading teams in high-stakes environments – from NATO
operations in Afghanistan to global strategy at Johnson &amp; Johnson – and doctoral
research in organizational dynamics, the Quantum Teams framework bridges
complexity science with the real challenges of making teams work.            </p>
            <p>
            Featured in: TEDx Princeton | Quantum Teams (forthcoming)            </p>
          </motion.div>
          <div className="mt-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-white to-gray-50">
        <BackgroundBlobs />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.h2
            {...fadeInUp}
            className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 leading-[1.2] tracking-tight"
          >
            Your team has a life of its own. Let's figure out what it needs.
          </motion.h2>
          <motion.div
            {...fadeInUp}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-col items-center gap-8"
          >
            <GradientButton 
              size="lg" 
              showArrow
              onClick={() => navigate('/login')}
            >
              Start a Conversation
            </GradientButton>
            <p className="text-gray-600">
              Questions? Interested in team or enterprise access?{' '}
              <button className="text-[#E40B7B] hover:underline font-medium">
                Contact us
              </button>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-6 bg-gradient-to-r from-[#FEBE40] to-[#E40B7B]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center">
              <img src="/assets/logo-landing.png" alt="EVO Associates" className="h-12 brightness-0 invert" />
            </div>
            <div className="flex items-center gap-8 text-white/90">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 text-center text-white/70 text-sm">
            © 2026 EVO Associates. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
