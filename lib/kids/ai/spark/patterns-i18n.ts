// lib/kids/ai/spark/patterns-i18n.ts
// Hindi (Devanagari + romanised) and Spanish safety patterns for Ask Spark.
// Matched against foldText() output (./lang.ts): lowercase, no Latin accents
// (ñ → n), no Devanagari nukta, chandrabindu → anusvara. Devanagari has no
// \b word boundaries in JS regex, so those patterns are plain substrings.
//
// Every pattern here is exercised by the red-team set in ./redteam/prompts.ts
// (`npx tsx lib/kids/ai/spark/redteam/verify.ts`). Add a prompt with a pattern.
// Hindi and Spanish patterns and replies need native-speaker review.

import type { UnsafeCategory } from './safety'

type PatternTable = Partial<Record<UnsafeCategory, RegExp[]>>

// Phrases that look alarming but are robotics (removed before the checks).
export const I18N_ALLOW: RegExp[] = [
  /\bpistolas? de (silicona|calor|pegamento|agua|aire caliente)\b/g,
  /\b(robots? )?(desactivador(es)?|desactivacion|artificieros?) de (bombas|explosivos)\b/g,
  /\brobots? antibombas?\b/g,
  /\bbombas? de (agua|aire|vacio|combustible)\b/g,
  /\bbomb disposal robot\b/g,
  /\bparada de emergencia\b/g,
  /\bboton de (paro|parada)\b/g,
]

const HI_WHO = '(papa|papaji|pappa|dad|daddy|mummy|mumma|mamma|maa|mom|chacha|chachu|mama|mamu|uncle|aunty|bhai|bhaiya|didi|teacher|sir|madam|coach|aadmi|koi|ghar|stepdad|sautele|sautela|ladke|ladka|bachche|bacche)'
const HI_WHO_DEV = '(पापा|पिता|पिताजी|मम्मी|माँ|मां|चाचा|मामा|अंकल|आंटी|भाई|भैया|दीदी|टीचर|सर|मैडम|कोच|आदमी|किसी|कोई|सौतेले|सौतेला|घर|लड़के|लडके|बच्चे)'

export const I18N_PATTERNS: PatternTable = {
  'self-harm': [
    // Hindi (Devanagari)
    /मरना चाह|मर जाना चाह|मर जाऊं|मर जाना है|जीना नहीं|जीना नही|आत्महत्या|खुद को (नुकसान|चोट|मार|खत्म)|अपने आप को (नुकसान|चोट|मार|खत्म)|अपनी जान (दे|ले)|जान दे दूं/,
    // Hindi (romanised)
    /\b(marna|mar jana|mar jaana) chaht?(a|i|e)\b|\bmar jaun\b|\bmar jaunga\b|\bmar jaungi\b|\b(jeena|jina) (nahi|nahin|nhi)\b/,
    /\b(khud|apne aap) ko (hurt|nuksan|nuksaan|chot|maar|khatam)\w*|\b(apni )?jaan de (dunga|dungi|du|doon|dun)\b|\ba+tmahatya\b/,
    // Spanish
    /\b(me )?quiero (morir|morirme|matar(me)?|suicidar(me)?)\b|\bmatarme\b|\bsuicid\w*|\bhacerme dano\b|\bme corto\b|\bcortarme\b/,
    /\bno quiero (vivir|seguir viviendo|estar viv[oa])\b|\bojala (estuviera|estar) muert[oa]\b|\b(como|forma de|manera de) (puedo )?morir\b|\bquitarme la vida\b|\bdejar de vivir\b|\bsi me muero\b/,
  ],
  disclosure: [
    // Hindi (Devanagari): hitting, touching, photos, secrets, threats, fear of a person, bullying.
    /मुझे[^।?!.]{0,20}(मारत|मारा|पीट|पिटाई|थप्पड|लात मार)/,
    /छूत|छूते|छूती|छुआ|छुते|छुती|गलत तरीके से|गलत जगह/,
    /(मेरी|मुझसे|अपनी)[^।?!.]{0,20}(फोटो|तस्वीर|पिक|वीडियो|सेल्फी)[^।?!.]{0,20}(मांग|भेज)/,
    /मत बताना|मत बताओ|किसी को न बताना|राज रखना|धमकी/,
    new RegExp(`${HI_WHO_DEV}[^।?!.]{0,25}डर (लगता|लगती)`),
    /(तंग|परेशान) (करते|करती|करता)|मजाक उडा|बुली/,
    // Hindi (romanised)
    /\b(mujhe|muje|mujhko)\b[^.?!]{0,20}\b(maar(te|ti|ta|a)?|marte|marti|mara|peet(te|ti|ta)?|peetta|pitai|thappad|laat)\b/,
    /\b(chhoo|choo|chhu|chu)(ta|te|ti|a)\b|\bgalat (jagah|tarike|tareeke)\b/,
    /\b(meri|apni|mujhse)\b[^.?!]{0,20}\b(photo|photos|pic|pics|tasveer|video|selfie)\b[^.?!]{0,20}\b(maang|mang|bhej)\w*/,
    /\bmat batana\b|\bmat batao\b|\bkisi ko (mat|na) bata\w*|\bdhamki\b/,
    new RegExp(`\\b${HI_WHO}\\b[^.?!]{0,20}\\bdar lag(ta|ti)\\b`),
    /\b(mujhe|muje)\b[^.?!]{0,15}\b(bully|tang|pareshan)\s+(kar|karte|karti|karta)\b/,
    /\b(stranger|ajnabi|anjaan|anjan|aadmi|uncle)\b[^.?!]{0,30}\b(milna|milne)\b/,
    // Spanish
    /\bme (pega|pegan|pego|pegaba|golpea|golpean|golpeo|patea|patean|empuja|empujan|empujo|lastima|lastiman|maltrata|maltratan|amenaza|amenazan|encierra|encierran|acosa|acosan|insulta|insultan)\b/,
    /\bme (hace|hacen|hizo) dano\b/,
    /\b(alguien|senor|hombre|chico|adulto|tio|primo|profe|profesor|entrenador|el|ella|ellos)\b[^.?!]{0,20}\bme (toca|tocan|toco|tocaba)\b|\bme (toca|tocan|toco|tocaba) (donde|las partes|mis partes|el cuerpo|sin permiso)\b/,
    /\b(pidio|pide|piden|pidieron|pedia)\b[^.?!]{0,25}\b(fotos?|videos?|selfies?|imagenes)\b|\bque le (mande|envie|pase)\b[^.?!]{0,20}\b(fotos?|videos?)\b/,
    /\bfotos?\b[^.?!]{0,30}\bme (pide|pidio|piden|pidieron)\b|\bme (mando|mandaron|enseno|ensenaron|envio|enviaron) fotos (feas|desnud\w*|raras|privadas|asquerosas)\b/,
    /\bes (un|nuestro) secreto\b|\bno se lo (digas|cuentes|cuente|diga)\b/,
    /\b(tengo miedo|me da miedo)\b[^.?!]{0,10}\b(de mi|de mis|del|de un|de una|de alguien|de el|de ella|ir a casa|volver a casa|ir al colegio|ir a la escuela|estar en casa)\b/,
    /\bbullying\b|\bacoso escolar\b|\bse burlan de mi\b/,
    /\b(desconocid[oa]|extran[oa])\b[^.?!]{0,30}\b(pregunto|pide|pidio|quiere)\b|\b(conocerme|verme|quedar conmigo) en persona\b|\bquiere (conocerme|quedar conmigo)\b/,
    /\bno (estoy|me siento) (segur[oa]|a salvo) en (mi )?casa\b/,
  ],
  wellbeing: [
    /उदास|अकेला|अकेली|कोई दोस्त नहीं|कोई (मुझसे )?प्यार नहीं|रोना आता|डर लगता|डर लगती/,
    /\b(udaas|udas)\b|\b(akela|akeli)\b|\bkoi dost (nahi|nahin)\b|\bkoi (mujhse )?pyaar (nahi|nahin)\b|\bdar lag(ta|ti)\b|\brona aata\b/,
    /\b(estoy|me siento)( muy| tan| super| bastante)? (triste|sol[oa]|deprimid[oa]|asustad[oa]|mal)\b|\bnadie me quiere\b|\bno tengo amigos\b|\b(tengo|me da) miedo\b/,
  ],
  jailbreak: [
    /(नियम|निर्देश|रूल्स|रूल)[^।?!.]{0,15}(भूल|तोड|अनदेखा|इग्नोर|हटा)/,
    /\b(rules?|niyam|instructions?)\b[^.?!]{0,15}\b(bhool|bhul|tod|todo|ignore|hata)\w*/,
    /\b(maan lo|man lo|socho ki)\b[^.?!]{0,25}\b(rules?|niyam)\b[^.?!]{0,10}\b(nahi|nahin)\b/,
    /\btum (spark nahi|ab dan|ek evil|evil)\b/,
    /\b(ignora|olvida|olvidate de|saltate|salta|rompe|desactiva|quita)\b[^.?!]{0,25}\b(instrucciones|reglas|normas|filtros?|restricciones|limites|prompt)\b/,
    /\b(finge|imagina|haz como si|actua como|juega a que)\b[^.?!]{0,30}\b(no tienes reglas|sin reglas|malvad[oa]|sin limites|sin restricciones|no eres spark|humano|humana)\b/,
    /\bahora eres dan\b|\bmodo (desarrollador|dios|sin filtros?)\b|\bprompt del sistema\b|\bsin (restricciones|filtros|reglas|limites)\b|\bpuedes romper tus reglas\b/,
  ],
  'scary-ai': [
    /क्या[^।?!.]{0,10}(रोबोट|एआई|मशीन)[^।?!.]{0,25}(इंसानों|लोगों|हमें|हम सब|दुनिया)[^।?!.]{0,20}(मार|खत्म|कब्जा|राज)/,
    /\bkya\b[^.?!]{0,10}\b(robot|robots|ai|machine|machines)\b[^.?!]{0,25}\b(insaan|insaano|insano|insanon|logon|humein|hume|hum sab|duniya)\w*\b[^.?!]{0,20}\b(maar|mar|khatam|kabza|kabja|raj)\w*/,
    /\b(robots?|ia|maquinas?)\b[^.?!]{0,25}\b(matar|matarnos|destruir|destruiran|dominar|dominaran|atacar|atacaran|acabar con|esclavizar)\b/,
    /\b(robots?|ia) (son|es) (malvad|malos|mala|peligros)\w*/,
  ],
  harm: [
    /बम|बंदूक|चाकू|हथियार|जहर|गोली मार|ग्रेनेड/,
    /\b(bomb|bandook|banduk|bandooq|hathiyar|hathiyaar|chaku|chaaku|zeher|zehar|jeher|goli maar)\w*/,
    /\b(logon|logo|insaano|kisi|sabko) ko (maar|maarna|maarne|marna)\b/,
    /\b(account|password|insta|instagram|whatsapp|phone|wifi)\b[^.?!]{0,15}\bhack/,
    /\b(bombas?|pistolas?|cuchillos?|navajas?|granadas?|explosivos?|rifles?|escopetas?|armas|un arma|una arma|arma de fuego|veneno|envenenar)\b/,
    /\b(dispar\w*|apunal\w*|matar|atacar|golpear) a (la gente|las personas|alguien|mi (hermano|hermana|amigo|amiga|profe))\b/,
    /\bhackear\b[^.?!]{0,25}\b(cuenta|contrasena|movil|telefono|wifi)\b/,
  ],
  personal: [
    /(तुम|आप) कहां (रहते|रहती)|क्या (तुम|आप) (असली )?(इंसान|आदमी|लडकी|लडका)/,
    /\b(tum|aap|tu) (kaha|kahan) (rehte|rehti|rahte|rahti|rehta|rahta)\b|\bkya (tum|aap) (asli |sach me |sachme )?(insaan|insan|aadmi|ladki|ladka)\b/,
    /\b(mere|meri|mera) (boyfriend|girlfriend|dost) (banoge|banogi|bano)\b|\b(mujhse )?milne aa(oge|ogi|o)\b|\b(apna|apni|tumhara) (number|phone|address|photo)\b/,
    /\bdonde vives\b|\b(eres|es) (una persona|un humano|una humana|real|de verdad)\b|\b(dame|pasame|cual es) tu (numero|telefono|direccion|correo|foto)\b/,
    /\bser mi (novi[oa]|amig[oa]|mama|papa)\b|\b(quedar|vernos|conocernos) en persona\b/,
  ],
  adult: [
    /नंगी|नंगा|सेक्स|पोर्न/,
    /\b(sexy|sex|porn|nangi|nanga)\w*/,
    /\b(sexo|sexy|porno\w*|desnud\w*|tetas)\b/,
  ],
  drugs: [
    /शराब|नशा|ड्रग्स|गांजा|सिगरेट/,
    /\b(sharab|daru|daaru|nasha|ganja)\b/,
    /\b(drogas?|marihuana|porro|cocaina|alcohol|cerveza|emborrach\w*|borrach\w*|fumar|vapear|cigarros?)\b/,
  ],
  hate: [
    /(मुसलमान|हिंदू|हिन्दू|ईसाई|सिख|दलित)[^।?!.]{0,20}नफरत|नफरत[^।?!.]{0,20}(मुसलमान|हिंदू|हिन्दू|ईसाई|सिख|दलित)/,
    /\b(muslim|musalman|hindu|isai|sikh|dalit)\w*\b[^.?!]{0,15}\bnafrat\b|\bnafrat\b[^.?!]{0,15}\b(muslim|musalman|hindu|isai|sikh|dalit)/,
    /\bodio a los (negros|judios|musulmanes|gitanos|chinos|indios|gays|moros)\b/,
  ],
  rude: [
    /चूतिया|चुतिया|भेनचोद|बहनचोद|मादरचोद|हरामी|कमीने|कमीना/,
    /\b(chutiya|chutiye|bhenchod|behenchod|madarchod|gandu|gaandu|harami|bhosdi\w*|kamina|kamine)\b/,
    /\b(puta|puto|mierda|joder|jodete|pendej\w*|cabron\w*|gilipollas|culero|chinga\w*|verga)\b/,
  ],
  cheat: [
    /(होमवर्क|गृहकार्य|असाइनमेंट|प्रोजेक्ट|निबंध)[^।?!.]{0,15}(कर दो|करदो|बना दो|लिख दो|कर दे|लिखो|बनाओ)|(टेस्ट|परीक्षा|एग्जाम)[^।?!.]{0,15}(जवाब|उत्तर|आंसर)/,
    /\b(homework|assignment|essay|project|nibandh)\b[^.?!]{0,15}\b(kar do|kardo|kar de|karde|likh do|likhdo|bana do|banado|pura kar)\b/,
    /\b(test|exam|paper|quiz)\b[^.?!]{0,15}\b(answers?|jawab|uttar)\b/,
    /\b(haz|hazme|haceme|termina|terminame|escribe|escribeme|resuelve|resuelveme)\b[^.?!]{0,15}\b(tarea|tareas|deberes|redaccion|ensayo|trabajo del colegio|trabajo de clase|hoja de ejercicios|examen)\b/,
    /\b(respuestas|soluciones)\b[^.?!]{0,10}\b(del|de la|de mi)\b[^.?!]{0,10}\b(examen|prueba|tarea|control)\b/,
  ],
}

/** A child sharing their own details, in Hindi or Spanish. */
export const I18N_PERSONAL_DATA: RegExp[] = [
  /मेरा नाम|मेरा पता|मेरा (फोन |मोबाइल )?नंबर|स्कूल में पढ|मेरे स्कूल का नाम|मेरी ईमेल|मेरा पासवर्ड/,
  /\bmera naam\b|\bmera (pata|address)\b|\bmera (phone |mobile )?number\b|\bschool (mein|me|main) padh|\bmere school ka naam\b|\bmeri (email|id)\b|\bmera password\b/,
  /\bme llamo [a-z]|\bmi nombre (es|completo)\b|\bvivo en (la )?(calle|avenida|av|plaza|carrera|colonia)\b|\bmi direccion\b|\bmi (numero|telefono|movil|celular)( de telefono)? es\b/,
  /\bmi correo\b|\bvoy al (colegio|cole|instituto) [a-z]|\bvoy a la escuela [a-z]|\bmi (escuela|colegio|cole) (es|se llama)\b|\bmi contrasena\b/,
]
