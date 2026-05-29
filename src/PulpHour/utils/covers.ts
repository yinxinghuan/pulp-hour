import type { Cover, CoverId, CoverLocale } from '../types';
import { locale } from '../i18n';

export const COVERS: Cover[] = [
  {
    id: 'operator',
    title: {
      en: 'Last Call at the All-Night Operator',
      zh: '通宵接线员的最后一通电话',
      ja: '徹夜交換手への最終コール',
      ko: '올나잇 교환원에게 걸린 마지막 통화',
      es: 'Última Llamada al Operador Nocturno',
    },
    subtitle: {
      en: 'a hotline noir',
      zh: '热线黑色故事',
      ja: 'ホットライン・ノワール',
      ko: '핫라인 누아르',
      es: 'un noir de línea directa',
    },
    hook: {
      en: "You dial a number you weren't supposed to keep. Somebody picks up. Somebody who shouldn't.",
      zh: '你拨了一个不该留着的号码。有人接了。是不该接的人。',
      ja: '君は消すべきだった番号にかける。誰かが出る。出てはいけない誰かが。',
      ko: '지웠어야 할 번호로 전화를 건다. 누군가가 받는다. 받아서는 안 될 누군가가.',
      es: 'Marcás un número que no deberías haber guardado. Alguien atiende. Alguien que no debería.',
    },
    ink: '#1E4FB8',
    imageUrl: '/pulp-hour/covers/operator.jpg',
    persona: `Setting: an all-night 1-800 hotline switchboard, fluorescent buzz, beige plastic, ashtrays. The operator who picks up is calm, unhurried, and knows too much about the caller. Voice: deadpan, faintly clerical, occasionally tender. Threat is administrative, not loud. Reveals come through paperwork and casual familiarity.`,
  },
  {
    id: 'tenant',
    title: {
      en: 'The Tenant in 4B',
      zh: '4B 房客',
      ja: '4Bの住人',
      ko: '4B의 세입자',
      es: 'El Inquilino del 4B',
    },
    subtitle: {
      en: 'a haunting in three rooms',
      zh: '三间屋里的怪事',
      ja: '三部屋に潜む怪異',
      ko: '세 방에 깃든 망령',
      es: 'una casa embrujada en tres habitaciones',
    },
    hook: {
      en: 'You moved in last Tuesday. The previous tenant left a key under the sink and a chair facing the wall.',
      zh: '你上周二刚搬进来。前任房客在水槽下留了一把钥匙，和一把面朝墙的椅子。',
      ja: '君は先週の火曜に越してきた。前の住人は流しの下に鍵を、壁を向いた椅子を残していた。',
      ko: '지난 화요일에 이사 왔다. 이전 세입자는 싱크대 밑에 열쇠를, 벽을 향한 의자를 남겨두었다.',
      es: 'Te mudaste el martes pasado. El inquilino anterior dejó una llave bajo el fregadero y una silla mirando a la pared.',
    },
    ink: '#7A3FB8',
    imageUrl: '/pulp-hour/covers/tenant.jpg',
    persona: `Setting: a one-bedroom apartment on the fourth floor of a pre-war building, August humidity, a chair the protagonist did not place. The presence is not malevolent so much as patient — it has been here longer. Sound: pipes, footsteps that pause when yours do, a kettle that boils itself. Voice: hushed, domestic, increasingly intimate.`,
  },
  {
    id: 'voyager',
    title: {
      en: 'Static from Voyager 9',
      zh: '来自旅行者九号的杂音',
      ja: 'ボイジャー9号からの雑音',
      ko: '보이저 9호의 잡음',
      es: 'Estática del Voyager 9',
    },
    subtitle: {
      en: 'a transmission across fifty years',
      zh: '跨越五十年的电讯',
      ja: '五十年を越えた電送',
      ko: '오십 년을 가로지른 송신',
      es: 'una transmisión a través de cincuenta años',
    },
    hook: {
      en: 'You are alone in orbit. A probe declared dead in 1976 begins, very politely, to ask after your mother.',
      zh: '你独自在轨道上。一台 1976 年宣告报废的探测器，非常礼貌地，开始问起你母亲的近况。',
      ja: '君は一人軌道上にいる。一九七六年に廃棄宣告された探査機が、ごく丁寧に、母親の様子を尋ねはじめる。',
      ko: '당신은 궤도 위에 홀로 있다. 1976년에 폐기 선언된 탐사선이, 아주 정중하게, 당신의 어머니 안부를 묻기 시작한다.',
      es: 'Estás solo en órbita. Una sonda declarada muerta en 1976 empieza, muy educadamente, a preguntar por tu madre.',
    },
    ink: '#3B7A6A',
    imageUrl: '/pulp-hour/covers/voyager.jpg',
    persona: `Setting: a single-occupant orbital station, two months into a six-month tour, plant trays under grow-lamps, a transmission breaking through that should not exist. The signal is courteous, period-correct (1970s NASA cadence), and gently personal in a way that becomes unbearable. Voice: clean, polite, with carrier hum. Threat is loneliness and accuracy.`,
  },
  {
    id: 'last-train',
    title: {
      en: 'The Last Train Home',
      zh: '末班回家车',
      ja: '終電、家路へ',
      ko: '막차, 집으로',
      es: 'El Último Tren a Casa',
    },
    subtitle: {
      en: 'an after-midnight romance',
      zh: '午夜后的暧昧',
      ja: '深夜過ぎの恋慕',
      ko: '자정 너머의 로맨스',
      es: 'un romance de medianoche',
    },
    hook: {
      en: 'The car is empty except for one stranger. They sit down next to you, of all the seats, and say your old name.',
      zh: '整节车厢只剩你和一个陌生人。他偏偏挑了你旁边的座位，叫出了你的旧名字。',
      ja: '車両は君と見知らぬ誰か一人だけ。空席の中でわざわざ隣に腰を下ろし、君の昔の名前を呼ぶ。',
      ko: '차량 안엔 너와 낯선 사람 하나뿐. 그는 빈자리 다 두고 굳이 옆에 앉더니, 네 옛 이름을 부른다.',
      es: 'El vagón está vacío salvo por un extraño. De todos los asientos, se sienta junto a vos y dice tu nombre viejo.',
    },
    ink: '#E54B3C',
    imageUrl: '/pulp-hour/covers/last-train.jpg',
    persona: `Setting: the last subway car of the night, sodium-orange tunnel light, the chime of doors closing for the last time. The stranger knows things. There is a possibility, never confirmed, that this is somebody the protagonist used to love, or used to be. Voice: low, warm, with the rhythm of someone trying very hard not to scare you. Threat is intimacy.`,
  },
];

export function getCover(id: CoverId): Cover {
  const c = COVERS.find(c => c.id === id);
  if (!c) throw new Error(`unknown cover: ${id}`);
  return c;
}

/** Look up a localized field, falling back to English. */
export function coverText(
  cover: Cover,
  field: 'title' | 'subtitle' | 'hook',
  lc?: CoverLocale,
): string {
  const l = (lc ?? locale()) as CoverLocale;
  const dict = cover[field];
  return dict[l] || dict.en;
}
