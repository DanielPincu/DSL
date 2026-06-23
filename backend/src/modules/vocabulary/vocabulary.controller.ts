import { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import Mission from '../missions/mission.model.js';
import User from '../users/user.model.js';

// Extra level-based vocabulary (not tied to specific missions)
const LEVEL_VOCAB: Record<string, { danish: string; english: string }[]> = {
  'A1': [
    { danish: 'ja', english: 'yes' },
    { danish: 'nej', english: 'no' },
    { danish: 'undskyld', english: 'excuse me / sorry' },
    { danish: 'tak', english: 'thank you' },
    { danish: 'hej', english: 'hello' },
    { danish: 'farvel', english: 'goodbye' },
    { danish: 'godmorgen', english: 'good morning' },
    { danish: 'godnat', english: 'good night' },
    { danish: 'hvordan har du det?', english: 'how are you?' },
    { danish: 'jeg hedder', english: 'my name is' },
    { danish: 'hvor kommer du fra?', english: 'where are you from?' },
    { danish: 'jeg forstår ikke', english: 'I do not understand' },
    { danish: 'kan du hjælpe mig?', english: 'can you help me?' },
    { danish: 'hvad koster det?', english: 'how much does it cost?' },
    { danish: 'jeg vil gerne have', english: 'I would like' },
    { danish: 'vand', english: 'water' },
    { danish: 'mad', english: 'food' },
    { danish: 'hus', english: 'house' },
    { danish: 'bil', english: 'car' },
    { danish: 'bog', english: 'book' },
    { danish: 'skole', english: 'school' },
    { danish: 'arbejde', english: 'work' },
    { danish: 'ven', english: 'friend' },
    { danish: 'familie', english: 'family' },
    { danish: 'dag', english: 'day' },
    { danish: 'tid', english: 'time' },
    { danish: 'i dag', english: 'today' },
    { danish: 'i morgen', english: 'tomorrow' },
    { danish: 'i går', english: 'yesterday' },
    { danish: 'nu', english: 'now' },
  ],
  'A2': [
    { danish: 'smerte', english: 'pain' },
    { danish: 'aftale', english: 'appointment' },
    { danish: 'medicin', english: 'medicine' },
    { danish: 'læge', english: 'doctor' },
    { danish: 'sygehus', english: 'hospital' },
    { danish: 'recept', english: 'prescription' },
    { danish: 'leje', english: 'to rent' },
    { danish: 'udlejer', english: 'landlord' },
    { danish: 'husleje', english: 'rent' },
    { danish: 'varme', english: 'heating' },
    { danish: 'nabo', english: 'neighbour' },
    { danish: 'kollega', english: 'colleague' },
    { danish: 'arbejdstid', english: 'working hours' },
    { danish: 'weekend', english: 'weekend' },
    { danish: 'frokost', english: 'lunch' },
    { danish: 'morgenmad', english: 'breakfast' },
    { danish: 'middag', english: 'dinner' },
    { danish: 'indkøb', english: 'shopping' },
    { danish: 'butik', english: 'shop' },
    { danish: 'pris', english: 'price' },
    { danish: 'kvittering', english: 'receipt' },
    { danish: 'størrelse', english: 'size' },
    { danish: 'farve', english: 'colour' },
    { danish: 'gave', english: 'gift' },
    { danish: 'post', english: 'mail / post' },
    { danish: 'pakke', english: 'package' },
    { danish: 'frimærke', english: 'stamp' },
    { danish: 'bibliotek', english: 'library' },
    { danish: 'svømmehal', english: 'swimming pool' },
    { danish: 'gymnastik', english: 'gym / exercise' },
  ],
  'B1': [
    { danish: 'ansøgning', english: 'application' },
    { danish: 'ansættelse', english: 'employment' },
    { danish: 'fyring', english: 'firing / layoff' },
    { danish: 'løn', english: 'salary' },
    { danish: 'skat', english: 'tax' },
    { danish: 'banklån', english: 'bank loan' },
    { danish: 'rente', english: 'interest rate' },
    { danish: 'forsikring', english: 'insurance' },
    { danish: 'erstatning', english: 'compensation' },
    { danish: 'klage', english: 'complaint' },
    { danish: 'indbrud', english: 'burglary' },
    { danish: 'tyveri', english: 'theft' },
    { danish: 'politi', english: 'police' },
    { danish: 'domstol', english: 'court' },
    { danish: 'advokat', english: 'lawyer' },
    { danish: 'kontrakt', english: 'contract' },
    { danish: 'underskrift', english: 'signature' },
    { danish: 'opsigelse', english: 'cancellation / notice' },
    { danish: 'abonnement', english: 'subscription' },
    { danish: 'medlemskab', english: 'membership' },
    { danish: 'kursus', english: 'course' },
    { danish: 'eksamen', english: 'exam' },
    { danish: 'bevis', english: 'certificate' },
    { danish: 'tilladelse', english: 'permission / permit' },
    { danish: 'kørekort', english: 'driving licence' },
    { danish: 'reparation', english: 'repair' },
    { danish: 'værksted', english: 'workshop / garage' },
    { danish: 'lejeaftale', english: 'rental agreement' },
    { danish: 'depositum', english: 'deposit' },
    { danish: 'fornyelse', english: 'renewal' },
  ],
  'B2': [
    { danish: 'ejendom', english: 'property' },
    { danish: 'bolig', english: 'housing / dwelling' },
    { danish: 'real kreditlån', english: 'mortgage' },
    { danish: 'vurdering', english: 'valuation' },
    { danish: 'mægler', english: 'agent / broker' },
    { danish: 'forhandling', english: 'negotiation' },
    { danish: 'kompromis', english: 'compromise' },
    { danish: 'ansættelseskontrakt', english: 'employment contract' },
    { danish: 'lønseddel', english: 'pay slip' },
    { danish: 'pension', english: 'pension' },
    { danish: 'investering', english: 'investment' },
    { danish: 'portefølje', english: 'portfolio' },
    { danish: 'aktie', english: 'share / stock' },
    { danish: 'opsparing', english: 'savings' },
    { danish: 'gæld', english: 'debt' },
    { danish: 'budget', english: 'budget' },
    { danish: 'regnskab', english: 'accounts / financial report' },
    { danish: 'revisor', english: 'accountant' },
    { danish: 'indvandring', english: 'immigration' },
    { danish: 'opholdstilladelse', english: 'residence permit' },
    { danish: 'statsborgerskab', english: 'citizenship' },
    { danish: 'integration', english: 'integration' },
    { danish: 'arbejdsmarked', english: 'labour market' },
    { danish: 'ledighed', english: 'unemployment' },
    { danish: 'dagpenge', english: 'unemployment benefits' },
    { danish: 'kontanthjælp', english: 'social welfare' },
    { danish: 'fagforening', english: 'labour union' },
    { danish: 'bestyrelse', english: 'board of directors' },
    { danish: 'netværk', english: 'network' },
    { danish: 'henvisning', english: 'referral' },
  ],
  'C1': [
    { danish: 'forfatning', english: 'constitution' },
    { danish: 'demokrati', english: 'democracy' },
    { danish: 'lovgivning', english: 'legislation' },
    { danish: 'afgørelse', english: 'decision / ruling' },
    { danish: 'ankesag', english: 'appeal case' },
    { danish: 'vidne', english: 'witness' },
    { danish: 'bevisbyrde', english: 'burden of proof' },
    { danish: 'fusion', english: 'merger' },
    { danish: 'opkøb', english: 'acquisition' },
    { danish: 'patent', english: 'patent' },
    { danish: 'licens', english: 'licence' },
    { danish: 'forhandlingsposition', english: 'negotiation position' },
    { danish: 'due diligence', english: 'due diligence' },
    { danish: 'risikovurdering', english: 'risk assessment' },
    { danish: 'afkast', english: 'return / yield' },
    { danish: 'diversificering', english: 'diversification' },
    { danish: 'formueforvaltning', english: 'wealth management' },
    { danish: 'skatteunddragelse', english: 'tax evasion' },
    { danish: 'dobbeltbeskatning', english: 'double taxation' },
    { danish: 'fratrædelsesordning', english: 'severance package' },
    { danish: 'barselsorlov', english: 'parental leave' },
    { danish: 'erhvervssygdom', english: 'occupational disease' },
    { danish: 'arbejdsskade', english: 'work injury' },
    { danish: 'rehabilitering', english: 'rehabilitation' },
    { danish: 'speciallæge', english: 'specialist doctor' },
    { danish: 'henvisning', english: 'referral (medical)' },
    { danish: 'psykolog', english: 'psychologist' },
    { danish: 'terapi', english: 'therapy' },
    { danish: 'velgørenhed', english: 'charity' },
    { danish: 'fond', english: 'foundation' },
  ],
};

export async function getAllVocabulary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { level, category } = req.query;

    const missionFilter: Record<string, unknown> = {};
    if (level && typeof level === 'string') missionFilter.level = level;
    if (category && typeof category === 'string') missionFilter.category = category;

    const missions = await Mission.find(missionFilter)
      .select('title slug level category vocabulary')
      .sort({ level: 1, order: 1 });

    const user = await User.findById(userId);
    const learnedSet = new Set(user?.learnedVocab || []);

    const words: Record<string, unknown>[] = [];

    // Mission vocabulary
    for (const mission of missions) {
      const json = mission.toJSON() as Record<string, unknown>;
      const vocab = (json.vocabulary as { danish: string; english: string }[]) || [];
      vocab.forEach((v, i) => {
        const id = `m:${json.slug}:${i}`;
        words.push({
          id, danish: v.danish, english: v.english,
          level: json.level, category: json.category,
          missionSlug: json.slug, missionTitle: json.title,
          learned: learnedSet.has(id),
        });
      });
    }

    // Level vocabulary (not tied to missions)
    const levels = level && typeof level === 'string' ? [level] : Object.keys(LEVEL_VOCAB);
    for (const lvl of levels) {
      const lv = LEVEL_VOCAB[lvl] || [];
      lv.forEach((v, i) => {
        const id = `l:${lvl}:${i}`;
        if (!category || category === 'general') {
          words.push({
            id, danish: v.danish, english: v.english,
            level: lvl, category: 'general',
            missionSlug: null, missionTitle: null,
            learned: learnedSet.has(id),
          });
        }
      });
    }

    res.json({ success: true, data: { words } });
  } catch (error) {
    console.error('Get vocabulary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vocabulary' });
  }
}

export async function toggleLearned(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { wordId, learned } = req.body;
    if (!wordId || typeof learned !== 'boolean') {
      res.status(400).json({ success: false, error: 'wordId and learned are required' });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (learned) {
      if (!user.learnedVocab.includes(wordId)) {
        user.learnedVocab.push(wordId);
      }
    } else {
      user.learnedVocab = user.learnedVocab.filter((w) => w !== wordId);
    }

    await user.save();
    res.json({ success: true, data: { learnedVocab: user.learnedVocab } });
  } catch (error) {
    console.error('Toggle learned error:', error);
    res.status(500).json({ success: false, error: 'Failed to update vocabulary' });
  }
}

export async function getLevelStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: { passedLevelQuizzes: user.passedLevelQuizzes || [] } });
  } catch (error) {
    console.error('Level status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get level status' });
  }
}

export async function submitLevelQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { level, answers } = req.body;
    if (!level || !Array.isArray(answers)) {
      res.status(400).json({ success: false, error: 'level and answers[] are required' });
      return;
    }

    // Get correct words for this level
    const missions = await Mission.find({ level }).select('vocabulary');
    const correctMap = new Map<string, string>(); // danish -> english

    for (const mission of missions) {
      const json = mission.toJSON() as Record<string, unknown>;
      const vocab = (json.vocabulary as { danish: string; english: string }[]) || [];
      for (const v of vocab) {
        correctMap.set(v.danish.toLowerCase().trim(), v.english);
      }
    }

    const lv = LEVEL_VOCAB[level] || [];
    for (const v of lv) {
      correctMap.set(v.danish.toLowerCase().trim(), v.english);
    }

    // Grade answers
    let correct = 0;
    const results: { danish: string; yourAnswer: string; correctAnswer: string; isCorrect: boolean }[] = [];

    for (const a of answers) {
      const expected = correctMap.get(a.danish.toLowerCase().trim());
      const isCorrect = expected === a.selectedEnglish;
      if (isCorrect) correct++;
      results.push({
        danish: a.danish,
        yourAnswer: a.selectedEnglish,
        correctAnswer: expected || 'unknown',
        isCorrect,
      });
    }

    const total = answers.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= 50;

    // Save pass status
    const user = await User.findById(req.userId);
    if (user && passed) {
      if (!user.passedLevelQuizzes.includes(level)) {
        user.passedLevelQuizzes.push(level);
        await user.save();
      }
    }

    res.json({ success: true, data: { passed, score, correct, total, results } });
  } catch (error) {
    console.error('Level quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit quiz' });
  }
}
