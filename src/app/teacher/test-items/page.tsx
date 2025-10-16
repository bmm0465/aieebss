import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function TestItemsPage() {
  const supabase = await createClient();

  // 세션 확인
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    redirect('/');
  }

  // 교사 권한 확인
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'teacher') {
    redirect('/lobby');
  }

  // 각 평가의 문항 데이터
  const testItems = {
    LNF: {
      title: "LNF - 고대 룬 문자 해독 시험",
      description: "알파벳 인식 능력 평가",
      totalItems: 200,
      items: [
        't', 'n', 'f', 'y', 'I', 'R', 'D', 'G', 'Y', 'V',
        'r', 'b', 'P', 'L', 'Z', 'i', 'c', 'A', 'O', 'J',
        'p', 'T', 'x', 'K', 'a', 'v', 'M', 'U', 'Q', 'h',
        'g', 'N', 'j', 'X', 's', 'C', 'H', 'q', 'o', 'm',
        'S', 'B', 'z', 'e', 'u', 'E', 'F', 'V', 'd', 'k',
        'R', 'U', 'X', 'h', 'y', 'O', 'q', 't', 'm', 'S',
        'x', 'K', 'e', 'c', 'T', 'G', 'Z', 'r', 'g', 'P',
        'L', 'Q', 's', 'k', 'N', 'J', 'i', 'p', 'A', 'D',
        'Y', 'a', 'f', 'I', 'H', 'V', 'n', 'v', 'E', 'F',
        'V', 'd', 'b', 'M', 'j', 'o', 'u', 'C', 'B', 'z',
        'e', 'h', 'c', 'v', 'T', 'P', 'D', 'L', 'K', 'V',
        's', 'g', 'M', 'G', 'X', 'i', 'f', 'I', 'B', 'z',
        'u', 'A', 'H', 'Y', 'o', 'k', 'R', 'j', 'Z', 'd',
        'b', 'N', 'F', 'Q', 'r', 'S', 'O', 'q', 't', 'p',
        'C', 'x', 'J', 'a', 'm', 'e', 'E', 'U', 'Z', 'n', 'y',
        'E', 'F', 'V', 'n', 'b', 'H', 'z', 'i', 'p', 'S',
        'O', 'Y', 'o', 'c', 'I', 'U', 'X', 'd', 'g', 'N',
        'j', 'Q', 'h', 'v', 'M', 'K', 'a', 'f', 'A', 'B',
        'J', 't', 'm', 'c', 'C', 'D', 'V', 'r', 'k', 'P', 'G',
        'V', 's', 'y', 'R', 'L', 'e', 'u', 'T', 'x', 'q'
      ],
      type: 'list',
      note: '학생은 알파벳의 이름(예: A → "에이")을 말해야 합니다. 대문자 81개, 소문자 119개 포함.'
    },
    PSF: {
      title: "PSF - 소리의 원소 분리 시험",
      description: "음소 분리 능력 평가",
      totalItems: 107,
      items: [
        "road", "dad", "six", "frog", "on", "cry", "sit", "camp", "farm", "bell",
        "plan", "hand", "gift", "stop", "map", "mad", "van", "pin", "star", "get",
        "top", "old", "ant", "cup", "pear", "pond", "milk", "son", "pen", "belt",
        "rug", "hit", "nut", "doll", "box", "bat", "cat", "bug", "win", "moon",
        "gold", "web", "mug", "man", "pig", "sand", "dig", "pot", "rock", "hot",
        "go", "bed", "mom", "fan", "ship", "an", "so", "desk", "wig", "ski",
        "car", "fog", "leg", "dog", "pull", "toad", "ten", "hen", "jog", "kid",
        "at", "fit", "but", "cold", "lion", "red", "sun", "jam", "mud", "hug",
        "up", "crab", "coin", "heel", "put", "run", "cut", "not", "tap", "pet",
        "dot", "big", "sip", "mop", "lid", "lip", "fin", "kit", "had", "can",
        "zoo", "hop", "hat", "deep", "lamp", "drum", "nest", "tent"
      ],
      type: 'list',
      note: '학생은 단어를 음소 단위로 분리해야 합니다 (예: cat → /k/ /æ/ /t/). AI가 자동 채점합니다.'
    },
    NWF: {
      title: "NWF - 초급 주문 시전 시험",
      description: "파닉스 적용 능력 평가",
      totalItems: 150,
      items: [
        "sep", "nem", "dib", "rop", "lin", "fom", "mig", "rup", "dep", "fod",
        "pid", "rit", "mag", "pim", "sog", "tib", "pon", "heg", "dem", "seb",
        "dop", "nug", "tet", "wep", "vom", "bem", "kun", "yut", "yad", "heb",
        "pom", "gid", "pag", "kom", "wog", "yig", "lan", "nen", "het", "som",
        "tig", "fon", "tup", "nin", "hon", "vid", "wim", "pob", "sed", "yod",
        "tud", "mem", "vot", "dob", "vun", "yed", "bim", "wod", "yab", "yun",
        "lem", "fub", "vut", "gim", "wid", "reb", "wap", "mip", "wem", "yom",
        "vad", "wum", "nim", "kep", "biv", "lum", "rik", "sab", "wug", "pac",
        "fot", "lut", "nam", "tok", "zam", "neb", "wut", "cun", "rif", "lom",
        "stam", "clen", "frap", "smop", "grut", "ston", "cles", "snid", "blut", "pren",
        "glom", "trab", "clom", "snut", "krat", "flot", "clor", "jent", "galk", "vrop",
        "pler", "drem", "trul", "skom", "tolt", "vrat", "blim", "sner", "larm", "fral",
        "sket", "trak", "plon", "trup", "smot", "gren", "frim", "prun", "twet", "draf",
        "snib", "glap", "frem", "morl", "spen", "drup", "fran", "plap", "clut", "spet",
        "crum", "frin", "baip", "ferk", "hilp", "krad", "clanp", "gop", "rin", "tep"
      ],
      type: 'list',
      note: 'Nonsense words (무의미 단어)를 파닉스 규칙으로 읽습니다. CVC 90개, CCVC/CVCC 50개, 복합 10개.'
    },
    WRF: {
      title: "WRF - 마법 단어 활성화 시험",
      description: "Sight Words 인식 능력 평가",
      totalItems: 85,
      items: [
        "no", "do", "he", "go", "it", "to", "me", "up", "the", "she", "yes", "you", "not", "who", "how",
        "this", "that", "like", "look", "good", "come", "have", "said", "love",
        "hat", "cat", "dad", "sit", "mom", "big", "dog", "pig", "six", "can", "two", "one",
        "pen", "leg", "pan", "car", "zoo", "red", "ten", "too", "what", "here", "down", "open", "much", "nice",
        "tall", "small", "hello", "three", "four", "five", "door", "book", "jump", "swim",
        "great", "green", "eight", "stand", "blue", "lion", "nine", "white", "many", "apple",
        "seven", "pizza", "sorry", "color", "close",
        "okay", "bye", "dance", "pencil", "sister", "sunny", "ball", "eraser"
      ],
      type: 'list',
      note: '자주 사용하는 Sight Words를 자동으로 인식합니다. 초고빈도 15개, 고빈도 35개, 중빈도 25개, 저빈도 10개.'
    },
    ORF: {
      title: "ORF - 고대 이야기 소생술 시험",
      description: "읽기 유창성 평가",
      totalItems: 1,
      passage: `Hello! How many dogs?
Hi! One, two, three, four. Four dogs!
Okay. Come in.

Do you have a ball?
Yes, I do. Here you are.
Thank you.

Catch the ball!

Do you have juice?
Yes, I do. Do you like orange juice?
Yes, I do. I like orange juice.
Here.
Thank you. Bye.
Goodbye.

At the Desk
Leo: What are you doing?
Mia: I am drawing a picture.
Leo: Wow. What is it?
Mia: It is a big, yellow sun.
Leo: I like your picture. It is very nice.
Mia: Thank you, Leo.

My Cookie
Sam: I have a cookie.
Kim: Wow, it is a big cookie.
Sam: Yes, it is. Do you want some?
Kim: Yes, please.
Sam: Here you are.
Kim: Thank you, Sam.

In the Park
Ann: What is that?
Ben: This is my new ball.
Ann: Wow, it is a big ball. I like the color.
Ben: Thank you. It is blue.
Ann: Can we play with the ball?
Ben: Yes! Let's play together.`,
      type: 'passage',
      note: '약 150단어의 대화형 지문. 5개 미니 스토리로 구성. WCPM과 정확도를 AI가 측정합니다.'
    },
    MAZE: {
      title: "MAZE - 지혜의 미로 탈출",
      description: "독해력 및 문맥 이해 평가",
      totalItems: 20,
      questions: [
        { num: 1, sentence: "I like _____ and oranges.", choices: ["apples", "books", "dogs"], answer: "apples" },
        { num: 2, sentence: "I don't like bananas and _____.", choices: ["jackets", "carrots", "robots"], answer: "carrots" },
        { num: 3, sentence: "I _____ swim and skate.", choices: ["don't", "can't", "will"], answer: "can't" },
        { num: 4, sentence: "I _____ a red bag.", choices: ["have", "make", "use"], answer: "have" },
        { num: 5, sentence: "a red bag and a red _____.", choices: ["pig", "door", "bike"], answer: "bike" },
        { num: 6, sentence: "The _____ is small and brown.", choices: ["puppy", "house", "play"], answer: "puppy" },
        { num: 7, sentence: "His _____ is Sam.", choices: ["hat", "name", "on"], answer: "name" },
        { num: 8, sentence: "Max likes to play _____ Sam.", choices: ["under", "with", "happy"], answer: "with" },
        { num: 9, sentence: "Max and Sam _____ to the park.", choices: ["eat", "red", "go"], answer: "go" },
        { num: 10, sentence: "Max has a red _____.", choices: ["ball", "is", "car"], answer: "ball" },
        { num: 11, sentence: "The sun is _____ and yellow.", choices: ["big", "run", "on"], answer: "big" },
        { num: 12, sentence: "Tom and his sister _____ to the beach.", choices: ["go", "sad", "bed"], answer: "go" },
        { num: 13, sentence: "They like _____ beach very much.", choices: ["for", "the", "her"], answer: "the" },
        { num: 14, sentence: "They play in the _____.", choices: ["sand", "book", "chair"], answer: "sand" },
        { num: 15, sentence: "Mia _____ a red hat.", choices: ["has", "see", "is"], answer: "has" },
        { num: 16, sentence: "He is in the _____.", choices: ["kitchen", "school", "car"], answer: "kitchen" },
        { num: 17, sentence: "He wants to make a _____.", choices: ["sandwich", "puppy", "game"], answer: "sandwich" },
        { num: 18, sentence: "He gets some bread and _____.", choices: ["cheese", "water", "ball"], answer: "cheese" },
        { num: 19, sentence: "He puts the cheese on _____ bread.", choices: ["the", "run", "of"], answer: "the" },
        { num: 20, sentence: "He puts more _____ on it.", choices: ["butter", "water", "cheese"], answer: "butter" }
      ],
      type: 'maze',
      note: '4개 스토리, 20개 문항. 문맥에 가장 적절한 단어를 선택합니다.'
    }
  };

  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/owl.png" alt="문항 확인" width={60} height={60} />
              <div style={{ marginLeft: '1rem' }}>
                <h1 style={{ 
                  fontSize: '2.5rem', 
                  margin: 0,
                  fontFamily: 'var(--font-nanum-pen)',
                  color: '#FFD700',
                  textShadow: '0 0 10px #FFD700'
                }}>
                  📋 평가 문항 및 정답 확인
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  각 평가에 출제되는 문항과 정답을 확인할 수 있습니다
                </p>
              </div>
            </div>
            <Link 
              href="/teacher/dashboard"
              style={{
                backgroundColor: 'rgba(255,215,0,0.2)',
                color: '#FFD700',
                padding: '0.8rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                border: '2px solid rgba(255,215,0,0.5)',
                fontWeight: 'bold'
              }}
            >
              ← 대시보드로
            </Link>
          </div>
        </div>

        {/* LNF */}
        <TestItemSection 
          title={testItems.LNF.title}
          description={testItems.LNF.description}
          totalItems={testItems.LNF.totalItems}
          items={testItems.LNF.items}
          type="list"
          note={testItems.LNF.note}
        />

        {/* PSF */}
        <TestItemSection 
          title={testItems.PSF.title}
          description={testItems.PSF.description}
          totalItems={testItems.PSF.totalItems}
          items={testItems.PSF.items}
          type="list"
          note={testItems.PSF.note}
        />

        {/* NWF */}
        <TestItemSection 
          title={testItems.NWF.title}
          description={testItems.NWF.description}
          totalItems={testItems.NWF.totalItems}
          items={testItems.NWF.items}
          type="list"
          note={testItems.NWF.note}
        />

        {/* WRF */}
        <TestItemSection 
          title={testItems.WRF.title}
          description={testItems.WRF.description}
          totalItems={testItems.WRF.totalItems}
          items={testItems.WRF.items}
          type="list"
          note={testItems.WRF.note}
        />

        {/* ORF */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '1.8rem' }}>
            {testItems.ORF.title}
          </h2>
          <p style={{ opacity: 0.9, marginBottom: '1rem' }}>{testItems.ORF.description}</p>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '10px',
            marginBottom: '1rem'
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace',
              fontSize: '1rem',
              lineHeight: '1.8',
              margin: 0
            }}>
              {testItems.ORF.passage}
            </pre>
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, fontStyle: 'italic' }}>
            💡 {testItems.ORF.note}
          </p>
        </div>

        {/* MAZE */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '2rem',
          borderRadius: '15px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '1.8rem' }}>
            {testItems.MAZE.title}
          </h2>
          <p style={{ opacity: 0.9, marginBottom: '1rem' }}>
            {testItems.MAZE.description} - 총 {testItems.MAZE.totalItems}문항
          </p>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {testItems.MAZE.questions.map((q) => (
              <div key={q.num} style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '1rem',
                borderRadius: '8px',
                borderLeft: '3px solid #FFD700'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#FFD700' }}>문항 {q.num}:</strong> {q.sentence}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  {q.choices.map((choice, idx) => (
                    <span 
                      key={idx}
                      style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '5px',
                        fontSize: '0.9rem',
                        backgroundColor: choice === q.answer 
                          ? 'rgba(76, 175, 80, 0.3)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        border: choice === q.answer 
                          ? '2px solid #4CAF50' 
                          : '1px solid rgba(255, 255, 255, 0.2)',
                        color: choice === q.answer ? '#4CAF50' : 'white'
                      }}
                    >
                      {choice} {choice === q.answer && '✓'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, fontStyle: 'italic', marginTop: '1rem' }}>
            💡 {testItems.MAZE.note}
          </p>
        </div>
      </div>
    </div>
  );
}

// 리스트형 문항 섹션 컴포넌트
function TestItemSection({ 
  title, 
  description, 
  totalItems, 
  items, 
  note 
}: { 
  title: string; 
  description: string; 
  totalItems: number; 
  items: string[]; 
  note: string;
}) {
  return (
    <div style={{
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: '2rem',
      borderRadius: '15px',
      marginBottom: '2rem',
      border: '1px solid rgba(255, 215, 0, 0.3)'
    }}>
      <h2 style={{ color: '#FFD700', marginBottom: '1rem', fontSize: '1.8rem' }}>
        {title}
      </h2>
      <p style={{ opacity: 0.9, marginBottom: '1rem' }}>
        {description} - 총 {totalItems}개 문항
      </p>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '1.5rem',
        borderRadius: '10px',
        maxHeight: '300px',
        overflowY: 'auto',
        marginBottom: '1rem'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
          gap: '0.5rem'
        }}>
          {items.map((item, idx) => (
            <div 
              key={idx}
              style={{
                padding: '0.5rem',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                borderRadius: '5px',
                textAlign: 'center',
                fontSize: '0.9rem',
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: '0.9rem', opacity: 0.7, fontStyle: 'italic' }}>
        💡 {note}
      </p>
    </div>
  );
}

