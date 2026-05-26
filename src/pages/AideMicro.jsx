import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Tablet, Monitor, Chrome, Globe, ChevronRight, ArrowLeft, Mic, CheckCircle, Settings, Lightbulb } from 'lucide-react'

// Logos de marque (non fournis par lucide-react). SVG inline, héritent de currentColor pour
// suivre le style des autres icônes (taille via les classes Tailwind du parent).
function AppleIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

function AndroidIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
    </svg>
  )
}

// Phase 1 — Structure et navigation uniquement.
// Le contenu réel des instructions (textes précis + captures) sera ajouté en phase 2.

const DEVICES = [
  { key: 'iphone', label: 'iPhone', icon: AppleIcon, needsBrowser: false },
  { key: 'ipad', label: 'iPad', icon: Tablet, needsBrowser: false },
  { key: 'android', label: 'Android', icon: AndroidIcon, needsBrowser: true },
  { key: 'ordinateur', label: 'Ordinateur', icon: Monitor, needsBrowser: true },
]

const BROWSERS = {
  android: [
    { key: 'chrome', label: 'Chrome', icon: Chrome },
    { key: 'samsung', label: 'Samsung Internet', icon: Globe },
    { key: 'autre', label: 'Autre navigateur', icon: Globe },
  ],
  ordinateur: [
    { key: 'chrome', label: 'Chrome', icon: Chrome },
    { key: 'autre', label: 'Autre navigateur', icon: Globe },
  ],
}

const DEVICE_LABEL = Object.fromEntries(DEVICES.map((d) => [d.key, d.label]))
const BROWSER_LABEL = {
  chrome: 'Chrome',
  samsung: 'Samsung Internet',
  autre: 'Autre navigateur',
}

// Instructions iPhone — deux sous-parties : cas normal (rapide) puis cas réglages (recours).
// La hiérarchie visuelle pousse l'utilisateur à essayer le cas simple en premier.
function InstructionsIphone() {
  return (
    <div className="space-y-4">
      {/* Cas normal — mis en avant, vert pour signaler "essayez ça d'abord" */}
      <div className="bg-white border-2 border-green-300 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            La première fois
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Quand vous lancez la saisie vocale pour la première fois, une fenêtre apparaît
          et vous demande l'autorisation. Touchez <strong>Autoriser</strong>. C'est tout.
        </p>
      </div>

      {/* Cas réglages — secondaire, présenté comme le recours */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <Settings className="w-6 h-6 text-gray-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Si vous avez refusé par erreur, ou si rien ne s'affiche
          </h3>
        </div>

        <ol className="space-y-3 text-base sm:text-lg text-gray-700">
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">1</span>
            <span>Ouvrez l'app <strong>Réglages</strong> de votre iPhone.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">2</span>
            <span>Descendez et touchez <strong>Safari</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">3</span>
            <span>Touchez <strong>Microphone</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">4</span>
            <span>Choisissez <strong>Autoriser</strong> (ou <strong>Demander</strong>).</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">5</span>
            <span>Revenez dans l'application et relancez la saisie vocale.</span>
          </li>
        </ol>

        <p className="mt-5 text-xs sm:text-sm text-gray-500 leading-relaxed">
          Selon votre version d'iPhone, le réglage Microphone peut se trouver dans une section{' '}
          <em>Permissions et confidentialité</em> à l'intérieur des réglages de Safari.
        </p>
      </div>
    </div>
  )
}

// Instructions iPad — même structure que iPhone (cas normal + cas réglages) avec une
// 3e card "astuce" propre à iPad (mode "Site web pour ordinateur" qui bloque le micro).
function InstructionsIpad() {
  return (
    <div className="space-y-4">
      {/* Cas normal — mis en avant */}
      <div className="bg-white border-2 border-green-300 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            La première fois
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Quand vous lancez la saisie vocale pour la première fois, une fenêtre apparaît
          et vous demande l'autorisation. Touchez <strong>Autoriser</strong>. C'est tout.
        </p>
      </div>

      {/* Cas réglages — recours */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <Settings className="w-6 h-6 text-gray-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Si vous avez refusé par erreur, ou si rien ne s'affiche
          </h3>
        </div>

        <ol className="space-y-3 text-base sm:text-lg text-gray-700">
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">1</span>
            <span>Ouvrez l'app <strong>Réglages</strong> de votre iPad.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">2</span>
            <span>Descendez et touchez <strong>Safari</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">3</span>
            <span>Touchez <strong>Microphone</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">4</span>
            <span>Choisissez <strong>Autoriser</strong> (ou <strong>Demander</strong>).</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">5</span>
            <span>Revenez dans l'application et relancez la saisie vocale.</span>
          </li>
        </ol>

        <p className="mt-5 text-xs sm:text-sm text-gray-500 leading-relaxed">
          Selon votre version d'iPad, le réglage Microphone peut se trouver dans une section{' '}
          <em>Permissions et confidentialité</em> à l'intérieur des réglages de Safari.
        </p>
      </div>

      {/* Astuce spécifique iPad — fond ambre pour signaler "conseil additionnel" */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <Lightbulb className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Toujours bloqué&nbsp;?
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Sur iPad, le mode «&nbsp;Site web pour ordinateur&nbsp;» peut empêcher le micro
          de fonctionner. Dans Safari, touchez le bouton <strong>aA</strong> à gauche
          de la barre d'adresse, puis désactivez <strong>Site web pour ordinateur</strong>.
          Rechargez ensuite la page.
        </p>
      </div>
    </div>
  )
}

// Instructions Android + Chrome — même 3-cards pattern que iPad (cas normal / réglages / dernier recours).
// Spécificité Android : deux niveaux d'autorisation (site dans Chrome, puis l'app Chrome elle-même).
function InstructionsAndroidChrome() {
  return (
    <div className="space-y-4">
      {/* Cas normal — mis en avant */}
      <div className="bg-white border-2 border-green-300 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            La première fois
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Quand vous lancez la saisie vocale pour la première fois, Chrome affiche
          une demande. Appuyez sur <strong>Autoriser</strong>. C'est tout.
        </p>
      </div>

      {/* Cas réglages Chrome — recours principal */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <Settings className="w-6 h-6 text-gray-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Si vous avez refusé par erreur, ou si rien ne s'affiche
          </h3>
        </div>

        <ol className="space-y-3 text-base sm:text-lg text-gray-700">
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">1</span>
            <span>Ouvrez <strong>Chrome</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">2</span>
            <span>En haut à droite, appuyez sur les <strong>trois points</strong>, puis sur <strong>Paramètres</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">3</span>
            <span>Appuyez sur <strong>Paramètres du site</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">4</span>
            <span>Appuyez sur <strong>Micro</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">5</span>
            <span>Si l'application est dans la liste <strong>Bloqués</strong>, appuyez dessus puis choisissez <strong>Autoriser</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">6</span>
            <span>Revenez dans l'application et relancez la saisie vocale.</span>
          </li>
        </ol>
      </div>

      {/* Dernier recours — autorisation au niveau de l'app Chrome dans les réglages Android */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <Lightbulb className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Toujours bloqué&nbsp;?
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Le micro est peut-être désactivé pour Chrome au niveau de votre téléphone.
          Ouvrez les <strong>Paramètres</strong> de votre téléphone, allez dans{' '}
          <strong>Applications</strong>, puis <strong>Chrome</strong>, puis{' '}
          <strong>Autorisations</strong>, et activez le <strong>Micro</strong>.
        </p>
        <p className="mt-4 text-xs sm:text-sm text-gray-500 leading-relaxed">
          Si vous utilisez un téléphone fourni par votre employeur ou votre école,
          l'accès au micro peut être verrouillé par l'administrateur et impossible à modifier.
        </p>
      </div>
    </div>
  )
}

// Instructions Android + Samsung Internet — même 3-cards pattern.
// Spécificité Samsung Internet : menu en BAS de l'écran (pas en haut comme Chrome),
// et terminologie différente (Sites et téléchargements > Autorisations du site).
function InstructionsAndroidSamsung() {
  return (
    <div className="space-y-4">
      {/* Cas normal — mis en avant */}
      <div className="bg-white border-2 border-green-300 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            La première fois
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Quand vous lancez la saisie vocale pour la première fois, le navigateur
          affiche une demande. Appuyez sur <strong>Autoriser</strong>. C'est tout.
        </p>
      </div>

      {/* Cas réglages Samsung Internet — recours principal */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <Settings className="w-6 h-6 text-gray-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Si vous avez refusé par erreur, ou si rien ne s'affiche
          </h3>
        </div>

        <ol className="space-y-3 text-base sm:text-lg text-gray-700">
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">1</span>
            <span>Ouvrez le navigateur <strong>Samsung Internet</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">2</span>
            <span>En bas de l'écran, appuyez sur le bouton <strong>Menu</strong> (les trois traits ou trois points).</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">3</span>
            <span>Appuyez sur <strong>Paramètres</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">4</span>
            <span>Appuyez sur <strong>Sites et téléchargements</strong>, puis sur <strong>Autorisations du site</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">5</span>
            <span>Appuyez sur <strong>Micro</strong> et assurez-vous qu'il est activé. Si l'application est dans la liste des sites bloqués, sélectionnez-la et choisissez <strong>Autoriser</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">6</span>
            <span>Revenez dans l'application et relancez la saisie vocale.</span>
          </li>
        </ol>
      </div>

      {/* Dernier recours — autorisation au niveau de l'app Samsung Internet dans les réglages Android */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <Lightbulb className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Toujours bloqué&nbsp;?
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Le micro est peut-être désactivé pour Samsung Internet au niveau de votre
          téléphone. Ouvrez les <strong>Paramètres</strong> de votre téléphone, allez
          dans <strong>Applications</strong>, puis <strong>Samsung Internet</strong>,
          puis <strong>Autorisations</strong>, et activez le <strong>Micro</strong>.
        </p>
        <p className="mt-4 text-xs sm:text-sm text-gray-500 leading-relaxed">
          Les noms exacts des menus peuvent varier légèrement selon la version de
          votre téléphone Samsung.
        </p>
      </div>
    </div>
  )
}

// Instructions génériques — partagées entre Android + Autre navigateur ET Ordinateur + Autre navigateur.
// On ne connaît pas le navigateur exact (Firefox, Edge, Opera, Brave…), donc on donne le PRINCIPE
// commun à tous les navigateurs, en couvrant à la fois mobile et ordinateur dans la 3e card.
function InstructionsGenerique() {
  return (
    <div className="space-y-4">
      {/* Cas normal — mis en avant */}
      <div className="bg-white border-2 border-green-300 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            La première fois
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Quand vous lancez la saisie vocale pour la première fois, votre navigateur
          affiche une demande d'autorisation. Appuyez sur <strong>Autoriser</strong>.
          Dans la plupart des cas, c'est tout.
        </p>
      </div>

      {/* Principe générique — recours principal */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <Settings className="w-6 h-6 text-gray-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Si vous avez refusé par erreur, ou si rien ne s'affiche
          </h3>
        </div>

        <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
          Chaque navigateur range ce réglage à un endroit un peu différent, mais le
          principe est toujours le même&nbsp;:
        </p>

        <ol className="space-y-3 text-base sm:text-lg text-gray-700">
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">1</span>
            <span>
              Cherchez une <strong>petite icône dans la barre d'adresse</strong>{' '}
              (souvent un cadenas, ou une icône de caméra/micro). Appuyez dessus&nbsp;:
              elle ouvre les autorisations du site.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">2</span>
            <span>
              Sinon, ouvrez le <strong>menu</strong> de votre navigateur (souvent
              trois points ou trois traits), puis cherchez <strong>Paramètres</strong>,
              puis <strong>Paramètres du site</strong> (ou «&nbsp;Autorisations&nbsp;»),
              puis <strong>Micro</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">3</span>
            <span>Réglez le micro sur <strong>Autoriser</strong> pour ce site.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">4</span>
            <span>Revenez dans l'application et relancez la saisie vocale.</span>
          </li>
        </ol>
      </div>

      {/* Dernier recours — autorisation au niveau du système (mobile ET ordinateur) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <Lightbulb className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Toujours bloqué&nbsp;?
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Sur téléphone, le micro peut être désactivé pour votre navigateur au niveau
          de l'appareil. Ouvrez les <strong>Paramètres</strong> de votre téléphone,
          allez dans <strong>Applications</strong>, choisissez votre navigateur, puis{' '}
          <strong>Autorisations</strong>, et activez le <strong>Micro</strong>. Sur
          ordinateur, vérifiez les réglages de confidentialité du système et autorisez
          le micro pour votre navigateur.
        </p>
        <p className="mt-4 text-xs sm:text-sm text-gray-500 leading-relaxed">
          Besoin d'aide pour votre navigateur précis&nbsp;? Le plus simple est souvent
          de chercher en ligne «&nbsp;autoriser le micro&nbsp;» suivi du nom de votre
          navigateur.
        </p>
      </div>
    </div>
  )
}

// Instructions Ordinateur + Chrome — 4 cards (cas normal / icône barre adresse / paramètres / dernier recours OS).
// Les deux recours intermédiaires partagent le même style gris : leurs titres les différencient.
function InstructionsOrdinateurChrome() {
  return (
    <div className="space-y-4">
      {/* Cas normal — mis en avant */}
      <div className="bg-white border-2 border-green-300 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            La première fois
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Quand vous lancez la saisie vocale pour la première fois, Chrome affiche
          une demande en haut de la fenêtre. Cliquez sur <strong>Autoriser</strong>.
          C'est tout.
        </p>
      </div>

      {/* Recours rapide — via l'icône de la barre d'adresse */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <Settings className="w-6 h-6 text-gray-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Si vous avez refusé par erreur
          </h3>
        </div>

        <ol className="space-y-3 text-base sm:text-lg text-gray-700">
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">1</span>
            <span>Cliquez sur l'<strong>icône à gauche de l'adresse du site</strong> (un petit réglage ou un cadenas).</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">2</span>
            <span>Trouvez la ligne <strong>Micro</strong> et réglez-la sur <strong>Autoriser</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">3</span>
            <span><strong>Rechargez la page</strong>, puis relancez la saisie vocale.</span>
          </li>
        </ol>
      </div>

      {/* Recours secondaire — via les paramètres de Chrome */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <Settings className="w-6 h-6 text-gray-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Ou par les paramètres
          </h3>
        </div>

        <ol className="space-y-3 text-base sm:text-lg text-gray-700">
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">1</span>
            <span>En haut à droite de Chrome, cliquez sur les <strong>trois points</strong>, puis sur <strong>Paramètres</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">2</span>
            <span>Cliquez sur <strong>Confidentialité et sécurité</strong>, puis sur <strong>Paramètres des sites</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">3</span>
            <span>Sous <strong>Autorisations</strong>, cliquez sur <strong>Micro</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">4</span>
            <span>Si le site est dans la liste <strong>Non autorisé</strong>, cliquez dessus et passez le micro sur <strong>Autoriser</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">5</span>
            <span>Rechargez la page et relancez la saisie vocale.</span>
          </li>
        </ol>
      </div>

      {/* Dernier recours — réglages de l'ordinateur (Windows / Mac) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <Lightbulb className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            Toujours bloqué&nbsp;?
          </h3>
        </div>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          Le micro est peut-être désactivé pour Chrome au niveau de votre ordinateur.
          Sur <strong>Windows</strong>, allez dans Paramètres, Confidentialité et
          sécurité, Microphone, et autorisez les applications de bureau à accéder au
          micro. Sur <strong>Mac</strong>, allez dans Réglages Système, Confidentialité
          et sécurité, Microphone, et cochez Chrome.
        </p>
        <p className="mt-4 text-xs sm:text-sm text-gray-500 leading-relaxed">
          Si vous utilisez un ordinateur fourni par votre employeur, l'accès au micro
          peut être verrouillé par l'administrateur et impossible à modifier.
        </p>
      </div>
    </div>
  )
}

// Bloc d'instructions placeholder pour la phase 1.
// Identifié par la combinaison (device, browser?) — `browser` vaut null pour iPhone / iPad.
function InstructionsPlaceholder({ device, browser }) {
  const titleParts = [DEVICE_LABEL[device]]
  if (browser) titleParts.push(BROWSER_LABEL[browser])
  const title = titleParts.join(' — ')

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-medium">
        Contenu à compléter (phase 2)
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        Autoriser le micro — {title}
      </h2>
      <p className="text-gray-600 mb-5">
        Les instructions détaillées et les captures d'écran pour cette combinaison
        seront ajoutées prochainement.
      </p>

      <ol className="space-y-3 text-sm sm:text-base text-gray-700">
        <li className="flex gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">1</span>
          <span>[Étape 1 — à rédiger pour <strong>{title}</strong>]</span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">2</span>
          <span>[Étape 2 — à rédiger pour <strong>{title}</strong>]</span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center justify-center">3</span>
          <span>[Étape 3 — à rédiger pour <strong>{title}</strong>]</span>
        </li>
      </ol>
    </div>
  )
}

export default function AideMicro() {
  const [device, setDevice] = useState(null)     // 'iphone' | 'ipad' | 'android' | 'ordinateur' | null
  const [browser, setBrowser] = useState(null)   // 'chrome' | 'samsung' | 'autre' | null

  const selectedDevice = DEVICES.find((d) => d.key === device) || null
  const needsBrowser = selectedDevice?.needsBrowser === true

  // Étape courante dérivée des choix (pas de state séparé pour éviter les désynchros).
  // - device null            → étape 1 (choix appareil)
  // - device sans navigateur → étape 3 (instructions)
  // - device avec navigateur, browser null    → étape 2 (choix navigateur)
  // - device avec navigateur, browser choisi  → étape 3 (instructions)
  const currentStep = !device ? 1 : (needsBrowser && !browser) ? 2 : 3

  const handleDeviceSelect = (key) => {
    setDevice(key)
    setBrowser(null) // toujours reset pour cohérence si l'utilisateur change d'appareil
  }

  const handleBrowserSelect = (key) => {
    setBrowser(key)
  }

  const resetAll = () => {
    setDevice(null)
    setBrowser(null)
  }

  const resetBrowser = () => {
    setBrowser(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — dégradé doré cohérent avec HelpButton */}
      <header
        className="text-white shadow-md"
        style={{ background: 'linear-gradient(135deg, #dbae61, #c19b4f)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                Autoriser le micro
              </h1>
              <p className="text-sm sm:text-base text-white/90">
                Guide pas à pas selon votre appareil
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Fil d'Ariane — visible dès qu'un choix a été fait, pour pouvoir revenir en arrière */}
        {device && (
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Changer d'appareil
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            {needsBrowser && browser ? (
              <>
                <button
                  type="button"
                  onClick={resetBrowser}
                  className="text-gray-700 hover:text-gray-900 hover:underline font-medium"
                >
                  {DEVICE_LABEL[device]}
                </button>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 font-semibold">{BROWSER_LABEL[browser]}</span>
              </>
            ) : (
              <span className="text-gray-900 font-semibold">{DEVICE_LABEL[device]}</span>
            )}
          </nav>
        )}

        {/* Étape 1 — Choix de l'appareil */}
        {currentStep === 1 && (
          <section>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Étape 1
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Quel appareil utilisez-vous&nbsp;?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEVICES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDeviceSelect(key)}
                  className="group flex items-center gap-4 p-4 sm:p-5 bg-white border-2 border-gray-200 rounded-xl text-left transition-all hover:border-[#dbae61] hover:shadow-md active:scale-[0.99]"
                >
                  <div
                    className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'linear-gradient(135deg, #dbae61, #c19b4f)' }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="flex-1 text-base sm:text-lg font-semibold text-gray-900">
                    {label}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#dbae61]" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Étape 2 — Choix du navigateur (Android / Ordinateur uniquement) */}
        {currentStep === 2 && (
          <section>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Étape 2 sur 3
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Quel navigateur utilisez-vous&nbsp;?
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Sur {DEVICE_LABEL[device]}, la procédure dépend du navigateur.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {BROWSERS[device].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleBrowserSelect(key)}
                  className="group flex items-center gap-4 p-4 sm:p-5 bg-white border-2 border-gray-200 rounded-xl text-left transition-all hover:border-[#dbae61] hover:shadow-md active:scale-[0.99]"
                >
                  <div
                    className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'linear-gradient(135deg, #dbae61, #c19b4f)' }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="flex-1 text-base sm:text-lg font-semibold text-gray-900">
                    {label}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#dbae61]" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Étape 3 — Instructions ciblées (placeholder phase 1) */}
        {currentStep === 3 && (
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Étape {needsBrowser ? 3 : 2} sur {needsBrowser ? 3 : 2}
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Vos instructions
              </h2>
            </div>

            {device === 'iphone' ? (
              <InstructionsIphone />
            ) : device === 'ipad' ? (
              <InstructionsIpad />
            ) : device === 'android' && browser === 'chrome' ? (
              <InstructionsAndroidChrome />
            ) : device === 'android' && browser === 'samsung' ? (
              <InstructionsAndroidSamsung />
            ) : device === 'ordinateur' && browser === 'chrome' ? (
              <InstructionsOrdinateurChrome />
            ) : browser === 'autre' ? (
              <InstructionsGenerique />
            ) : (
              <InstructionsPlaceholder
                device={device}
                browser={needsBrowser ? browser : null}
              />
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Recommencer
              </button>
            </div>
          </section>
        )}

        {/* Lien retour vers l'app — utile si la page n'a pas été ouverte en nouvel onglet */}
        <div className="pt-4 border-t border-gray-200">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            ← Retour à l'application
          </Link>
        </div>
      </main>
    </div>
  )
}
