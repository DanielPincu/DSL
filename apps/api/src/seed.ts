import mongoose from 'mongoose';
import { env } from './config/env.js';
import Mission from './modules/missions/mission.model.js';

const missions = [
  // ═══ A1 — Beginner ═══
  {
    title: 'Spørg i Netto',
    slug: 'ask-in-netto',
    category: 'shopping' as const,
    level: 'A1' as const,
    order: 1,
    description: 'Ask a shop assistant where to find something in the supermarket.',
    scenarioPrompt: 'You are shopping in Netto and cannot find the milk. You need to ask a shop assistant for help.',
    npcName: 'Lone',
    npcRole: 'medarbejder i Netto (Netto employee)',
    requiredPhrases: ['Undskyld', 'Hvor finder jeg mælk?', 'Tak for hjælpen'],
  },

  // ═══ A2 — Elementary ═══
  {
    title: 'Ring til lægen',
    slug: 'call-the-doctor',
    category: 'health' as const,
    level: 'A2' as const,
    order: 1,
    description: 'Call the doctor to book an appointment. Explain your symptoms and schedule a time.',
    scenarioPrompt: 'You wake up feeling sick with a sore throat and fever. You need to call your local doctor (læge) to book an appointment. The receptionist answers.',
    npcName: 'Mette',
    npcRole: 'lægesekretær (doctor receptionist)',
    requiredPhrases: ['Jeg er syg', 'Jeg har ondt i halsen', 'Jeg vil gerne bestille en tid'],
  },
  {
    title: 'Tal med din udlejer',
    slug: 'talk-to-landlord',
    category: 'housing' as const,
    level: 'A2' as const,
    order: 2,
    description: 'Talk to your landlord about a problem in your apartment.',
    scenarioPrompt: 'The heating in your apartment has stopped working and it is winter. You need to call your landlord to explain the problem and ask when it can be fixed.',
    npcName: 'Søren',
    npcRole: 'udlejer (landlord)',
    requiredPhrases: ['Varmen virker ikke', 'Det er meget koldt', 'Hvornår kan du komme?'],
  },
  {
    title: 'Smalltalk med en kollega',
    slug: 'small-talk-coworker',
    category: 'social' as const,
    level: 'A2' as const,
    order: 3,
    description: 'Have a casual conversation with a colleague during lunch.',
    scenarioPrompt: 'It is lunchtime at work and you sit down next to a colleague. You chat about the weekend, the weather, and work.',
    npcName: 'Anna',
    npcRole: 'kollega på arbejdet (work colleague)',
    requiredPhrases: ['Hvordan går det?', 'Hvad lavede du i weekenden?', 'Det lyder hyggeligt'],
  },

  // ═══ B1 — Intermediate ═══
  {
    title: 'Forklar et bilproblem',
    slug: 'car-problem',
    category: 'shopping' as const,
    level: 'B1' as const,
    order: 1,
    description: 'Explain a car problem to a mechanic.',
    scenarioPrompt: 'Your car is making a strange noise when you brake. You take it to a mechanic and need to explain the problem.',
    npcName: 'Jens',
    npcRole: 'mekaniker (car mechanic)',
    requiredPhrases: ['Der er en mærkelig lyd', 'Når jeg bremser', 'Hvad koster det?'],
  },
  {
    title: 'Ring til internet support',
    slug: 'internet-support',
    category: 'technology' as const,
    level: 'B1' as const,
    order: 2,
    description: 'Call internet provider support to fix a connection issue.',
    scenarioPrompt: 'Your internet has been down for two days. You call your internet provider support to report the issue and troubleshoot.',
    npcName: 'Thomas',
    npcRole: 'internet support medarbejder (internet support agent)',
    requiredPhrases: ['Mit internet virker ikke', 'Jeg har prøvet at genstarte', 'Hvornår kan I fikse det?'],
  },
  {
    title: 'Bank aftale',
    slug: 'bank-appointment',
    category: 'finance' as const,
    level: 'B1' as const,
    order: 3,
    description: 'Speak with a bank advisor about opening an account.',
    scenarioPrompt: 'You have just moved to Denmark and need to open a bank account. You have an appointment with a bank advisor.',
    npcName: 'Camilla',
    npcRole: 'bankrådgiver (bank advisor)',
    requiredPhrases: ['Jeg vil gerne åbne en konto', 'Hvad skal jeg bruge?', 'Hvad er gebyrerne?'],
  },
  {
    title: 'På kommunen',
    slug: 'municipality-office',
    category: 'government' as const,
    level: 'B1' as const,
    order: 4,
    description: 'Visit the municipality office to handle administrative tasks.',
    scenarioPrompt: 'You need to update your address at the municipality office (kommune). You speak with a caseworker.',
    npcName: 'Pia',
    npcRole: 'kommunal sagsbehandler (municipality caseworker)',
    requiredPhrases: ['Jeg skal flytte', 'Jeg vil gerne ændre min adresse', 'Hvilke dokumenter har jeg brug for?'],
  },
  {
    title: 'Jobsamtale',
    slug: 'job-interview',
    category: 'work' as const,
    level: 'B1' as const,
    order: 5,
    description: 'Participate in a job interview in Danish.',
    scenarioPrompt: 'You have applied for a job as a customer service representative at a Danish company. The manager is interviewing you.',
    npcName: 'Henrik',
    npcRole: 'ansættelseschef (hiring manager)',
    requiredPhrases: ['Jeg har erfaring med', 'Jeg er god til', 'Jeg vil gerne arbejde hos jer'],
  },

  // ═══ B2 — Upper Intermediate ═══
  {
    title: 'Borgerskab interview',
    slug: 'citizenship-interview',
    category: 'citizenship' as const,
    level: 'B2' as const,
    order: 1,
    description: 'Prepare for the Danish citizenship interview.',
    scenarioPrompt: 'You have an interview as part of your Danish citizenship application. The interviewer asks about Danish culture, history, and society.',
    npcName: 'Lars',
    npcRole: 'borgerskabsmedarbejder (citizenship officer)',
    requiredPhrases: ['Danmark er et kongerige', 'Grundloven er vigtig', 'Jeg vil gerne være dansk statsborger'],
  },
];

async function seed(): Promise<void> {
  try {
    await mongoose.connect(`${env.MONGO_URI}/${env.DB_NAME}`);
    console.log('Connected to MongoDB');

    // Clear existing missions
    await Mission.deleteMany({});
    console.log('Cleared existing missions');

    // Insert missions
    await Mission.insertMany(missions);
    console.log(`Seeded ${missions.length} missions successfully`);

    for (const mission of missions) {
      console.log(`  ✓ [${mission.level}:${mission.order}] ${mission.title}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
