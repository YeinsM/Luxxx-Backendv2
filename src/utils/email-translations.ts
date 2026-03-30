/**
 * Email translations for all user-facing email templates.
 * Admin-only emails (invitation, security alerts, service suggestions) remain in Spanish.
 */

export type EmailLang = 'es' | 'en' | 'nl' | 'pt' | 'pl';

const SUPPORTED_LANGS: EmailLang[] = ['es', 'en', 'nl', 'pt', 'pl'];

export function resolveEmailLang(lang?: string): EmailLang {
  if (lang && SUPPORTED_LANGS.includes(lang as EmailLang)) {
    return lang as EmailLang;
  }
  return 'es';
}

// ══════════════════════════════════════════════════════════════
// Translation dictionaries
// ══════════════════════════════════════════════════════════════

const translations: Record<string, Record<EmailLang, string>> = {
  // ── Common ──
  copyrightSuffix: {
    es: 'Todos los derechos reservados.',
    en: 'All rights reserved.',
    nl: 'Alle rechten voorbehouden.',
    pt: 'Todos os direitos reservados.',
    pl: 'Wszelkie prawa zastrzeżone.',
  },
  autoEmailNotice: {
    es: 'Este es un correo automático. Por favor no responder.',
    en: 'This is an automated email. Please do not reply.',
    nl: 'Dit is een automatisch e-mail. Gelieve niet te antwoorden.',
    pt: 'Este é um e-mail automático. Por favor, não responda.',
    pl: 'To jest automatyczna wiadomość e-mail. Prosimy nie odpowiadać.',
  },
  needHelp: {
    es: '¿Necesitas ayuda? Estamos aquí para ti 💬',
    en: 'Need help? We are here for you 💬',
    nl: 'Hulp nodig? We zijn er voor je 💬',
    pt: 'Precisa de ajuda? Estamos aqui para você 💬',
    pl: 'Potrzebujesz pomocy? Jesteśmy tu dla Ciebie 💬',
  },
  questionsContact: {
    es: 'Si tienes alguna pregunta, no dudes en contactarnos.',
    en: 'If you have any questions, feel free to contact us.',
    nl: 'Als je vragen hebt, neem gerust contact met ons op.',
    pt: 'Se tiver alguma dúvida, não hesite em entrar em contato.',
    pl: 'Jeśli masz pytania, skontaktuj się z nami.',
  },
  autoEmailFooter: {
    es: 'Este es un correo automático, por favor no respondas a este mensaje.',
    en: 'This is an automated email, please do not reply to this message.',
    nl: 'Dit is een automatisch bericht, gelieve niet te reageren op dit bericht.',
    pt: 'Este é um e-mail automático, por favor não responda a esta mensagem.',
    pl: 'To jest automatyczna wiadomość, prosimy nie odpowiadać na tę wiadomość.',
  },

  // ── Verification Email ──
  verifyEmailTitle: {
    es: 'Verifica tu Email',
    en: 'Verify Your Email',
    nl: 'Verifieer je e-mail',
    pt: 'Verifique seu E-mail',
    pl: 'Zweryfikuj swój e-mail',
  },
  verifyEmailGreeting: {
    es: 'Hola,',
    en: 'Hello,',
    nl: 'Hallo,',
    pt: 'Olá,',
    pl: 'Cześć,',
  },
  verifyEmailBody: {
    es: 'Por favor verifica tu dirección de email haciendo clic en el botón de abajo:',
    en: 'Please verify your email address by clicking the button below:',
    nl: 'Verifieer je e-mailadres door op de onderstaande knop te klikken:',
    pt: 'Por favor, verifique seu endereço de e-mail clicando no botão abaixo:',
    pl: 'Proszę zweryfikuj swój adres e-mail, klikając poniższy przycisk:',
  },
  verifyEmailButton: {
    es: 'Verificar Email',
    en: 'Verify Email',
    nl: 'E-mail verifiëren',
    pt: 'Verificar E-mail',
    pl: 'Zweryfikuj e-mail',
  },
  verifyEmailIgnore: {
    es: 'Si no creaste esta cuenta, puedes ignorar este email.',
    en: 'If you did not create this account, you can ignore this email.',
    nl: 'Als je dit account niet hebt aangemaakt, kun je deze e-mail negeren.',
    pt: 'Se você não criou esta conta, pode ignorar este e-mail.',
    pl: 'Jeśli nie utworzyłeś tego konta, możesz zignorować tę wiadomość.',
  },
  verifyEmailSubject: {
    es: 'Verifica tu email',
    en: 'Verify your email',
    nl: 'Verifieer je e-mail',
    pt: 'Verifique seu e-mail',
    pl: 'Zweryfikuj swój e-mail',
  },

  // ── Password Reset Email ──
  resetPasswordTitle: {
    es: 'Recuperar contraseña',
    en: 'Reset Password',
    nl: 'Wachtwoord herstellen',
    pt: 'Recuperar senha',
    pl: 'Resetuj hasło',
  },
  resetPasswordBody1: {
    es: 'Recibimos una solicitud para restablecer tu contraseña.',
    en: 'We received a request to reset your password.',
    nl: 'We hebben een verzoek ontvangen om je wachtwoord te herstellen.',
    pt: 'Recebemos uma solicitação para redefinir sua senha.',
    pl: 'Otrzymaliśmy prośbę o zresetowanie Twojego hasła.',
  },
  resetPasswordBody2: {
    es: 'Haz clic en el botón para crear una nueva contraseña. Este enlace expira en 30 minutos y solo puede usarse una vez.',
    en: 'Click the button to create a new password. This link expires in 30 minutes and can only be used once.',
    nl: 'Klik op de knop om een nieuw wachtwoord aan te maken. Deze link verloopt over 30 minuten en kan slechts één keer worden gebruikt.',
    pt: 'Clique no botão para criar uma nova senha. Este link expira em 30 minutos e só pode ser usado uma vez.',
    pl: 'Kliknij przycisk, aby utworzyć nowe hasło. Ten link wygasa za 30 minut i może być użyty tylko raz.',
  },
  resetPasswordButton: {
    es: 'Restablecer contraseña',
    en: 'Reset Password',
    nl: 'Wachtwoord herstellen',
    pt: 'Redefinir senha',
    pl: 'Resetuj hasło',
  },
  resetPasswordFallback: {
    es: 'Si el botón no funciona, copia y pega este enlace:',
    en: 'If the button does not work, copy and paste this link:',
    nl: 'Als de knop niet werkt, kopieer en plak dan deze link:',
    pt: 'Se o botão não funcionar, copie e cole este link:',
    pl: 'Jeśli przycisk nie działa, skopiuj i wklej ten link:',
  },
  resetPasswordIgnore: {
    es: 'Si no solicitaste este cambio, ignora este correo.',
    en: 'If you did not request this change, ignore this email.',
    nl: 'Als je deze wijziging niet hebt aangevraagd, negeer dan deze e-mail.',
    pt: 'Se você não solicitou esta alteração, ignore este e-mail.',
    pl: 'Jeśli nie prosiłeś o tę zmianę, zignoruj tę wiadomość.',
  },
  resetPasswordSubject: {
    es: 'Restablecer contraseña',
    en: 'Reset password',
    nl: 'Wachtwoord herstellen',
    pt: 'Redefinir senha',
    pl: 'Resetuj hasło',
  },

  // ── Welcome Email (common) ──
  welcomeAccountCreated: {
    es: 'Tu cuenta ha sido creada exitosamente.',
    en: 'Your account has been created successfully.',
    nl: 'Je account is succesvol aangemaakt.',
    pt: 'Sua conta foi criada com sucesso.',
    pl: 'Twoje konto zostało pomyślnie utworzone.',
  },
  welcomeAccountType: {
    es: 'Tipo de cuenta',
    en: 'Account type',
    nl: 'Accounttype',
    pt: 'Tipo de conta',
    pl: 'Typ konta',
  },
  welcomeUnderReview: {
    es: 'Tu cuenta está ahora en revisión. Recibirás una notificación cuando sea aprobada.',
    en: 'Your account is now under review. You will receive a notification when it is approved.',
    nl: 'Je account wordt nu beoordeeld. Je ontvangt een melding wanneer deze is goedgekeurd.',
    pt: 'Sua conta está em análise. Você receberá uma notificação quando for aprovada.',
    pl: 'Twoje konto jest teraz w trakcie weryfikacji. Otrzymasz powiadomienie, gdy zostanie zatwierdzone.',
  },
  welcomeWhileMeantime: {
    es: 'Mientras tanto, puedes:',
    en: 'In the meantime, you can:',
    nl: 'In de tussentijd kun je:',
    pt: 'Enquanto isso, você pode:',
    pl: 'W międzyczasie możesz:',
  },
  welcomeCompleteProfile: {
    es: 'Completar tu perfil',
    en: 'Complete your profile',
    nl: 'Je profiel voltooien',
    pt: 'Completar seu perfil',
    pl: 'Uzupełnić swój profil',
  },
  welcomeExplorePlatform: {
    es: 'Explorar la plataforma',
    en: 'Explore the platform',
    nl: 'Het platform verkennen',
    pt: 'Explorar a plataforma',
    pl: 'Odkrywać platformę',
  },
  welcomeSetPreferences: {
    es: 'Configurar tus preferencias',
    en: 'Set your preferences',
    nl: 'Je voorkeuren instellen',
    pt: 'Configurar suas preferências',
    pl: 'Ustawić swoje preferencje',
  },
  welcomeTeamSignature: {
    es: 'El equipo de',
    en: 'The team at',
    nl: 'Het team van',
    pt: 'A equipe do',
    pl: 'Zespół',
  },

  // ── Escort Welcome ──
  escortWelcomeTitle: {
    es: '¡Bienvenida Sexy',
    en: 'Welcome Sexy',
    nl: 'Welkom Sexy',
    pt: 'Bem-vinda Sexy',
    pl: 'Witaj Sexy',
  },
  escortProfileReady: {
    es: 'Tu perfil de modelo está listo',
    en: 'Your model profile is ready',
    nl: 'Je modelprofiel is klaar',
    pt: 'Seu perfil de modelo está pronto',
    pl: 'Twój profil modelki jest gotowy',
  },
  escortTimeToShine: {
    es: '¡Es hora de brillar! ✨',
    en: 'Time to shine! ✨',
    nl: 'Tijd om te schitteren! ✨',
    pt: 'Hora de brilhar! ✨',
    pl: 'Czas zabłysnąć! ✨',
  },
  escortAccountCreated: {
    es: 'Tu cuenta ha sido creada exitosamente. Ahora puedes comenzar a promocionar tus servicios y conectar con clientes potenciales.',
    en: 'Your account has been successfully created. You can now start promoting your services and connecting with potential clients.',
    nl: 'Je account is succesvol aangemaakt. Je kunt nu beginnen met het promoten van je diensten en contact leggen met potentiële klanten.',
    pt: 'Sua conta foi criada com sucesso. Agora você pode começar a promover seus serviços e se conectar com clientes em potencial.',
    pl: 'Twoje konto zostało pomyślnie utworzone. Możesz teraz zacząć promować swoje usługi i łączyć się z potencjalnymi klientami.',
  },
  escortNextSteps: {
    es: '📋 Próximos pasos:',
    en: '📋 Next steps:',
    nl: '📋 Volgende stappen:',
    pt: '📋 Próximos passos:',
    pl: '📋 Następne kroki:',
  },
  escortStep1: {
    es: '• Completa tu perfil con fotos profesionales',
    en: '• Complete your profile with professional photos',
    nl: '• Vul je profiel aan met professionele foto\'s',
    pt: '• Complete seu perfil com fotos profissionais',
    pl: '• Uzupełnij swój profil profesjonalnymi zdjęciami',
  },
  escortStep2: {
    es: '• Agrega una descripción detallada de tus servicios',
    en: '• Add a detailed description of your services',
    nl: '• Voeg een gedetailleerde beschrijving van je diensten toe',
    pt: '• Adicione uma descrição detalhada dos seus serviços',
    pl: '• Dodaj szczegółowy opis swoich usług',
  },
  escortStep3: {
    es: '• Configura tus tarifas y disponibilidad',
    en: '• Set your rates and availability',
    nl: '• Stel je tarieven en beschikbaarheid in',
    pt: '• Configure suas tarifas e disponibilidade',
    pl: '• Ustaw swoje stawki i dostępność',
  },
  escortStep4: {
    es: '• Activa las notificaciones para no perder clientes',
    en: '• Enable notifications so you don\'t miss clients',
    nl: '• Schakel meldingen in zodat je geen klanten mist',
    pt: '• Ative as notificações para não perder clientes',
    pl: '• Włącz powiadomienia, aby nie przegapić klientów',
  },
  goToPanel: {
    es: 'Ir a mi Panel',
    en: 'Go to my Panel',
    nl: 'Ga naar mijn Panel',
    pt: 'Ir ao meu Painel',
    pl: 'Przejdź do Panelu',
  },

  // ── Member Welcome ──
  memberWelcomeTitle: {
    es: '¡Bienvenido',
    en: 'Welcome',
    nl: 'Welkom',
    pt: 'Bem-vindo',
    pl: 'Witaj',
  },
  memberAccountReady: {
    es: 'Tu cuenta de miembro está lista',
    en: 'Your member account is ready',
    nl: 'Je ledenaccount is klaar',
    pt: 'Sua conta de membro está pronta',
    pl: 'Twoje konto członkowskie jest gotowe',
  },
  memberAllSet: {
    es: '¡Todo listo para explorar! ✨',
    en: 'All set to explore! ✨',
    nl: 'Klaar om te verkennen! ✨',
    pt: 'Tudo pronto para explorar! ✨',
    pl: 'Gotowe do odkrywania! ✨',
  },
  memberAccountCreated: {
    es: 'Tu cuenta de miembro ha sido registrada exitosamente en nuestra plataforma. Ya puedes disfrutar de todas las funcionalidades exclusivas.',
    en: 'Your member account has been successfully registered on our platform. You can now enjoy all exclusive features.',
    nl: 'Je ledenaccount is succesvol geregistreerd op ons platform. Je kunt nu genieten van alle exclusieve functies.',
    pt: 'Sua conta de membro foi registrada com sucesso em nossa plataforma. Agora você pode aproveitar todas as funcionalidades exclusivas.',
    pl: 'Twoje konto członkowskie zostało pomyślnie zarejestrowane na naszej platformie. Możesz teraz korzystać ze wszystkich ekskluzywnych funkcji.',
  },
  memberFeaturesTitle: {
    es: 'Características de tu cuenta 📋',
    en: 'Your account features 📋',
    nl: 'Accountfuncties 📋',
    pt: 'Recursos da sua conta 📋',
    pl: 'Funkcje Twojego konta 📋',
  },
  memberFeature1: {
    es: '✓ Gestión de favoritos',
    en: '✓ Favorites management',
    nl: '✓ Favorieten beheren',
    pt: '✓ Gerenciamento de favoritos',
    pl: '✓ Zarządzanie ulubionymi',
  },
  memberFeature2: {
    es: '✓ Sistema de valoraciones',
    en: '✓ Rating system',
    nl: '✓ Beoordelingssysteem',
    pt: '✓ Sistema de avaliações',
    pl: '✓ System ocen',
  },
  memberFeature3: {
    es: '✓ Notificaciones personalizadas',
    en: '✓ Personalized notifications',
    nl: '✓ Gepersonaliseerde meldingen',
    pt: '✓ Notificações personalizadas',
    pl: '✓ Spersonalizowane powiadomienia',
  },
  memberFeature4: {
    es: '✓ Preferencias de búsqueda',
    en: '✓ Search preferences',
    nl: '✓ Zoekvoorkeuren',
    pt: '✓ Preferências de busca',
    pl: '✓ Preferencje wyszukiwania',
  },
  explorePlatformButton: {
    es: 'Explorar Plataforma 🚀',
    en: 'Explore Platform 🚀',
    nl: 'Platform verkennen 🚀',
    pt: 'Explorar Plataforma 🚀',
    pl: 'Odkryj Platformę 🚀',
  },

  // ── Agency Welcome ──
  agencyWelcomeTitle: {
    es: '¡Bienvenida',
    en: 'Welcome',
    nl: 'Welkom',
    pt: 'Bem-vinda',
    pl: 'Witaj',
  },
  agencyRegistered: {
    es: 'Tu agencia ha sido registrada',
    en: 'Your agency has been registered',
    nl: 'Je agentschap is geregistreerd',
    pt: 'Sua agência foi registrada',
    pl: 'Twoja agencja została zarejestrowana',
  },
  agencyUnderReview: {
    es: '¡Cuenta en revisión! ⏳',
    en: 'Account under review! ⏳',
    nl: 'Account wordt beoordeeld! ⏳',
    pt: 'Conta em análise! ⏳',
    pl: 'Konto w trakcie weryfikacji! ⏳',
  },
  agencyAccountCreated: {
    es: 'Tu agencia ha sido registrada exitosamente en nuestra plataforma. Estamos revisando tu información y pronto recibirás una notificación de aprobación.',
    en: 'Your agency has been successfully registered on our platform. We are reviewing your information and you will soon receive an approval notification.',
    nl: 'Je agentschap is succesvol geregistreerd op ons platform. We beoordelen je informatie en je ontvangt binnenkort een goedkeuringsmelding.',
    pt: 'Sua agência foi registrada com sucesso em nossa plataforma. Estamos analisando suas informações e em breve você receberá uma notificação de aprovação.',
    pl: 'Twoja agencja została pomyślnie zarejestrowana na naszej platformie. Weryfikujemy Twoje dane i wkrótce otrzymasz powiadomienie o zatwierdzeniu.',
  },
  agencyPanelTitle: {
    es: 'Panel de administración 📋',
    en: 'Administration panel 📋',
    nl: 'Beheerpaneel 📋',
    pt: 'Painel de administração 📋',
    pl: 'Panel administracyjny 📋',
  },
  agencyFeature1: {
    es: '✓ Gestión de perfiles de modelos',
    en: '✓ Model profile management',
    nl: '✓ Beheer van modelprofielen',
    pt: '✓ Gerenciamento de perfis de modelos',
    pl: '✓ Zarządzanie profilami modelek',
  },
  agencyFeature2: {
    es: '✓ Información de la agencia',
    en: '✓ Agency information',
    nl: '✓ Agentschapsinformatie',
    pt: '✓ Informações da agência',
    pl: '✓ Informacje o agencji',
  },
  agencyFeature3: {
    es: '✓ Sistema de reservas',
    en: '✓ Booking system',
    nl: '✓ Reserveringssysteem',
    pt: '✓ Sistema de reservas',
    pl: '✓ System rezerwacji',
  },
  agencyFeature4: {
    es: '✓ Reportes y estadísticas',
    en: '✓ Reports and statistics',
    nl: '✓ Rapporten en statistieken',
    pt: '✓ Relatórios e estatísticas',
    pl: '✓ Raporty i statystyki',
  },
  accessPanelButton: {
    es: 'Acceder al Panel 🚀',
    en: 'Access Panel 🚀',
    nl: 'Ga naar het Panel 🚀',
    pt: 'Acessar o Painel 🚀',
    pl: 'Przejdź do Panelu 🚀',
  },

  // ── Club Welcome ──
  clubWelcomeTitle: {
    es: '¡Bienvenido',
    en: 'Welcome',
    nl: 'Welkom',
    pt: 'Bem-vindo',
    pl: 'Witaj',
  },
  clubRegistered: {
    es: 'Tu establecimiento ha sido registrado',
    en: 'Your establishment has been registered',
    nl: 'Je vestiging is geregistreerd',
    pt: 'Seu estabelecimento foi registrado',
    pl: 'Twój lokal został zarejestrowany',
  },
  clubUnderReview: {
    es: '¡Cuenta en revisión! ⏳',
    en: 'Account under review! ⏳',
    nl: 'Account wordt beoordeeld! ⏳',
    pt: 'Conta em análise! ⏳',
    pl: 'Konto w trakcie weryfikacji! ⏳',
  },
  clubAccountCreated: {
    es: 'Tu establecimiento ha sido registrado exitosamente en nuestra plataforma. Estamos revisando tu información y pronto recibirás una notificación de aprobación.',
    en: 'Your establishment has been successfully registered on our platform. We are reviewing your information and you will soon receive an approval notification.',
    nl: 'Je vestiging is succesvol geregistreerd op ons platform. We beoordelen je informatie en je ontvangt binnenkort een goedkeuringsmelding.',
    pt: 'Seu estabelecimento foi registrado com sucesso em nossa plataforma. Estamos analisando suas informações e em breve você receberá uma notificação de aprovação.',
    pl: 'Twój lokal został pomyślnie zarejestrowany na naszej platformie. Weryfikujemy Twoje dane i wkrótce otrzymasz powiadomienie o zatwierdzeniu.',
  },
  clubPanelTitle: {
    es: 'Panel de administración 📋',
    en: 'Administration panel 📋',
    nl: 'Beheerpaneel 📋',
    pt: 'Painel de administração 📋',
    pl: 'Panel administracyjny 📋',
  },
  clubFeature1: {
    es: '✓ Galería de fotos del local',
    en: '✓ Venue photo gallery',
    nl: '✓ Fotogalerij van het etablissement',
    pt: '✓ Galeria de fotos do local',
    pl: '✓ Galeria zdjęć lokalu',
  },
  clubFeature2: {
    es: '✓ Horarios y eventos',
    en: '✓ Schedules and events',
    nl: '✓ Roosters en evenementen',
    pt: '✓ Horários e eventos',
    pl: '✓ Harmonogramy i wydarzenia',
  },
  clubFeature3: {
    es: '✓ Servicios y tarifas',
    en: '✓ Services and rates',
    nl: '✓ Diensten en tarieven',
    pt: '✓ Serviços e tarifas',
    pl: '✓ Usługi i cennik',
  },
  clubFeature4: {
    es: '✓ Promociones especiales',
    en: '✓ Special promotions',
    nl: '✓ Speciale promoties',
    pt: '✓ Promoções especiais',
    pl: '✓ Specjalne promocje',
  },

  // ── Welcome Subjects ──
  escortWelcomeSubject: {
    es: '¡Bienvenida a',
    en: 'Welcome to',
    nl: 'Welkom bij',
    pt: 'Bem-vinda ao',
    pl: 'Witaj w',
  },
  memberWelcomeSubject: {
    es: '¡Bienvenido a',
    en: 'Welcome to',
    nl: 'Welkom bij',
    pt: 'Bem-vindo ao',
    pl: 'Witaj w',
  },
  agencyWelcomeSubject: {
    es: '¡Bienvenida tu Agencia a',
    en: 'Welcome your Agency to',
    nl: 'Welkom je agentschap bij',
    pt: 'Bem-vinda sua Agência ao',
    pl: 'Witaj w swojej Agencji w',
  },
  clubWelcomeSubject: {
    es: '¡Bienvenido tu Club a',
    en: 'Welcome your Club to',
    nl: 'Welkom je club bij',
    pt: 'Bem-vindo seu Club ao',
    pl: 'Witaj w swoim Klubie w',
  },

  // ── OTP Email ──
  otpTitle: {
    es: 'Código de Verificación',
    en: 'Verification Code',
    nl: 'Verificatiecode',
    pt: 'Código de Verificação',
    pl: 'Kod weryfikacyjny',
  },
  otpBody: {
    es: 'Ingresa el siguiente código para completar tu inicio de sesión:',
    en: 'Enter the following code to complete your login:',
    nl: 'Voer de volgende code in om je aanmelding te voltooien:',
    pt: 'Insira o seguinte código para completar seu login:',
    pl: 'Wprowadź poniższy kod, aby zakończyć logowanie:',
  },
  otpExpires: {
    es: 'Este código expira en <strong>10 minutos</strong>.',
    en: 'This code expires in <strong>10 minutes</strong>.',
    nl: 'Deze code verloopt over <strong>10 minuten</strong>.',
    pt: 'Este código expira em <strong>10 minutos</strong>.',
    pl: 'Ten kod wygasa za <strong>10 minut</strong>.',
  },
  otpIgnore: {
    es: 'Si no solicitaste este código, ignora este correo.',
    en: 'If you did not request this code, ignore this email.',
    nl: 'Als je deze code niet hebt aangevraagd, negeer dan deze e-mail.',
    pt: 'Se você não solicitou este código, ignore este e-mail.',
    pl: 'Jeśli nie prosiłeś o ten kod, zignoruj tę wiadomość.',
  },
  otpSubject: {
    es: 'Tu código de acceso:',
    en: 'Your access code:',
    nl: 'Je toegangscode:',
    pt: 'Seu código de acesso:',
    pl: 'Twój kod dostępu:',
  },

  // ── Verification Status Email ──
  verificationPanel: {
    es: 'Panel de verificación',
    en: 'Verification panel',
    nl: 'Verificatiepaneel',
    pt: 'Painel de verificação',
    pl: 'Panel weryfikacji',
  },
  statusVerified: {
    es: 'VERIFICADO',
    en: 'VERIFIED',
    nl: 'GEVERIFIEERD',
    pt: 'VERIFICADO',
    pl: 'ZWERYFIKOWANY',
  },
  statusRejected: {
    es: 'RECHAZADO',
    en: 'REJECTED',
    nl: 'AFGEWEZEN',
    pt: 'REJEITADO',
    pl: 'ODRZUCONY',
  },
  verifiedSubjectPrefix: {
    es: '✅ Tu anuncio',
    en: '✅ Your ad',
    nl: '✅ Je advertentie',
    pt: '✅ Seu anúncio',
    pl: '✅ Twoje ogłoszenie',
  },
  rejectedSubjectPrefix: {
    es: '❌ Tu anuncio',
    en: '❌ Your ad',
    nl: '❌ Je advertentie',
    pt: '❌ Seu anúncio',
    pl: '❌ Twoje ogłoszenie',
  },
  verifiedSubject: {
    es: 'Tu anuncio "{adName}" ha sido verificado',
    en: 'Your ad "{adName}" has been verified',
    nl: 'Je advertentie "{adName}" is geverifieerd',
    pt: 'Seu anúncio "{adName}" foi verificado',
    pl: 'Twoje ogłoszenie "{adName}" zostało zweryfikowane',
  },
  rejectedSubject: {
    es: 'Tu anuncio "{adName}" ha sido rechazado',
    en: 'Your ad "{adName}" has been rejected',
    nl: 'Je advertentie "{adName}" is afgewezen',
    pt: 'Seu anúncio "{adName}" foi rejeitado',
    pl: 'Twoje ogłoszenie "{adName}" zostało odrzucone',
  },
  verifiedSubjectSuffix: {
    es: 'ha sido verificado',
    en: 'has been verified',
    nl: 'is geverifieerd',
    pt: 'foi verificado',
    pl: 'zostało zweryfikowane',
  },
  rejectedSubjectSuffix: {
    es: 'ha sido rechazado',
    en: 'has been rejected',
    nl: 'is afgewezen',
    pt: 'foi rejeitado',
    pl: 'zostało odrzucone',
  },
  verifiedBody: {
    es: 'Tu solicitud de verificación ha sido aprobada. Ya puedes disfrutar de los beneficios de tener un perfil verificado.',
    en: 'Your verification request has been approved. You can now enjoy the benefits of having a verified profile.',
    nl: 'Je verificatieverzoek is goedgekeurd. Je kunt nu genieten van de voordelen van een geverifieerd profiel.',
    pt: 'Sua solicitação de verificação foi aprovada. Agora você pode aproveitar os benefícios de ter um perfil verificado.',
    pl: 'Twoja prośba o weryfikację została zatwierdzona. Możesz teraz cieszyć się korzyściami zweryfikowanego profilu.',
  },
  rejectedBody: {
    es: 'Tu solicitud de verificación no ha sido aprobada. Revisa el motivo a continuación y vuelve a intentarlo.',
    en: 'Your verification request has not been approved. Review the reason below and try again.',
    nl: 'Je verificatieverzoek is niet goedgekeurd. Bekijk de reden hieronder en probeer het opnieuw.',
    pt: 'Sua solicitação de verificação não foi aprovada. Veja o motivo abaixo e tente novamente.',
    pl: 'Twoja prośba o weryfikację nie została zatwierdzona. Sprawdź poniższy powód i spróbuj ponownie.',
  },
  rejectionReason: {
    es: 'Motivo del rechazo',
    en: 'Reason for rejection',
    nl: 'Reden van afwijzing',
    pt: 'Motivo da rejeição',
    pl: 'Powód odrzucenia',
  },
  verificationContactSupport: {
    es: 'Si tienes dudas, ponte en contacto con nuestro equipo de soporte.',
    en: 'If you have any questions, please contact our support team.',
    nl: 'Als je vragen hebt, neem dan contact op met ons supportteam.',
    pt: 'Se tiver dúvidas, entre em contato com nossa equipe de suporte.',
    pl: 'Jeśli masz pytania, skontaktuj się z naszym zespołem wsparcia.',
  },

  // ── Launch Credits Email ──
  launchCreditsTitle: {
    es: '🎁 ¡{credits} Créditos de Regalo!',
    en: '🎁 {credits} Gift Credits!',
    nl: '🎁 {credits} Cadeau Tegoeden!',
    pt: '🎁 {credits} Créditos de Presente!',
    pl: '🎁 {credits} Darmowych Kredytów!',
  },
  launchCreditsSubtitle: {
    es: 'Para celebrar tu llegada a {appName}',
    en: 'To celebrate your arrival at {appName}',
    nl: 'Om je aankomst bij {appName} te vieren',
    pt: 'Para celebrar sua chegada ao {appName}',
    pl: 'Aby uczcić Twoje przybycie do {appName}',
  },
  launchCreditsGreeting: {
    es: 'Hola <strong style="color: #ffffff;">{name}</strong>, como regalo de lanzamiento, hemos añadido <strong style="color: #f472b6;">{credits} créditos</strong> a tu cuenta. Úsalos para destacar tu perfil y conseguir más visibilidad.',
    en: 'Hi <strong style="color: #ffffff;">{name}</strong>, as a launch gift, we have added <strong style="color: #f472b6;">{credits} credits</strong> to your account. Use them to highlight your profile and get more visibility.',
    nl: 'Hallo <strong style="color: #ffffff;">{name}</strong>, als lanceringscadeau hebben we <strong style="color: #f472b6;">{credits} tegoeden</strong> aan je account toegevoegd. Gebruik ze om je profiel te benadrukken en meer zichtbaarheid te krijgen.',
    pt: 'Olá <strong style="color: #ffffff;">{name}</strong>, como presente de lançamento, adicionamos <strong style="color: #f472b6;">{credits} créditos</strong> à sua conta. Use-os para destacar seu perfil e obter mais visibilidade.',
    pl: 'Cześć <strong style="color: #ffffff;">{name}</strong>, jako prezent na start, dodaliśmy <strong style="color: #f472b6;">{credits} kredytów</strong> do Twojego konta. Użyj ich, aby wyróżnić swój profil i zyskać większą widoczność.',
  },
  launchCreditsUnit: {
    es: 'créditos',
    en: 'credits',
    nl: 'tegoeden',
    pt: 'créditos',
    pl: 'kredytów',
  },
  launchCreditsWhatToDo: {
    es: '✨ ¿Qué puedes hacer?',
    en: '✨ What can you do?',
    nl: '✨ Wat kun je doen?',
    pt: '✨ O que você pode fazer?',
    pl: '✨ Co możesz zrobić?',
  },
  launchCreditsFeature1: {
    es: '• Activar un <strong style="color: #ffffff;">Boost</strong> para aparecer en la primera posición',
    en: '• Activate a <strong style="color: #ffffff;">Boost</strong> to appear in the first position',
    nl: '• Activeer een <strong style="color: #ffffff;">Boost</strong> om op de eerste positie te verschijnen',
    pt: '• Ative um <strong style="color: #ffffff;">Boost</strong> para aparecer na primeira posição',
    pl: '• Aktywuj <strong style="color: #ffffff;">Boost</strong>, aby pojawić się na pierwszej pozycji',
  },
  launchCreditsFeature2: {
    es: '• <strong style="color: #ffffff;">Promocionar</strong> tu anuncio para mayor alcance',
    en: '• <strong style="color: #ffffff;">Promote</strong> your ad for greater reach',
    nl: '• <strong style="color: #ffffff;">Promoot</strong> je advertentie voor een groter bereik',
    pt: '• <strong style="color: #ffffff;">Promova</strong> seu anúncio para maior alcance',
    pl: '• <strong style="color: #ffffff;">Promuj</strong> swoje ogłoszenie, aby dotrzeć do większej liczby osób',
  },
  launchCreditsFeature3: {
    es: '• <strong style="color: #ffffff;">Destacar</strong> tu perfil entre las demás',
    en: '• <strong style="color: #ffffff;">Highlight</strong> your profile among the rest',
    nl: '• <strong style="color: #ffffff;">Markeer</strong> je profiel tussen de rest',
    pt: '• <strong style="color: #ffffff;">Destaque</strong> seu perfil entre os demais',
    pl: '• <strong style="color: #ffffff;">Wyróżnij</strong> swój profil wśród pozostałych',
  },
  launchCreditsButton: {
    es: 'Ir a mi Panel',
    en: 'Go to My Panel',
    nl: 'Ga naar mijn Paneel',
    pt: 'Ir ao meu Painel',
    pl: 'Przejdź do mojego Panelu',
  },
  launchCreditsBalance: {
    es: '💰 Tu saldo actual',
    en: '💰 Your current balance',
    nl: '💰 Je huidige saldo',
    pt: '💰 Seu saldo atual',
    pl: '💰 Twoje aktualne saldo',
  },
  launchCreditsAdded: {
    es: 'Añadidos automáticamente a tu cuenta',
    en: 'Automatically added to your account',
    nl: 'Automatisch toegevoegd aan je account',
    pt: 'Adicionados automaticamente à sua conta',
    pl: 'Automatycznie dodane do Twojego konta',
  },
  launchCreditsWhatCanDo: {
    es: '✨ ¿Qué puedes hacer?',
    en: '✨ What can you do?',
    nl: '✨ Wat kun je doen?',
    pt: '✨ O que você pode fazer?',
    pl: '✨ Co możesz zrobić?',
  },
  launchCreditsAction1: {
    es: '• Activar un <strong style="color: #ffffff;">Boost</strong> para aparecer en la primera posición',
    en: '• Activate a <strong style="color: #ffffff;">Boost</strong> to appear in the first position',
    nl: '• Activeer een <strong style="color: #ffffff;">Boost</strong> om op de eerste positie te verschijnen',
    pt: '• Ative um <strong style="color: #ffffff;">Boost</strong> para aparecer na primeira posição',
    pl: '• Aktywuj <strong style="color: #ffffff;">Boost</strong>, aby pojawić się na pierwszej pozycji',
  },
  launchCreditsAction2: {
    es: '• <strong style="color: #ffffff;">Promocionar</strong> tu anuncio para mayor alcance',
    en: '• <strong style="color: #ffffff;">Promote</strong> your ad for greater reach',
    nl: '• <strong style="color: #ffffff;">Promoot</strong> je advertentie voor een groter bereik',
    pt: '• <strong style="color: #ffffff;">Promova</strong> seu anúncio para maior alcance',
    pl: '• <strong style="color: #ffffff;">Promuj</strong> swoje ogłoszenie, aby dotrzeć do większej liczby osób',
  },
  launchCreditsAction3: {
    es: '• <strong style="color: #ffffff;">Destacar</strong> tu perfil entre las demás',
    en: '• <strong style="color: #ffffff;">Highlight</strong> your profile among the rest',
    nl: '• <strong style="color: #ffffff;">Markeer</strong> je profiel tussen de rest',
    pt: '• <strong style="color: #ffffff;">Destaque</strong> seu perfil entre os demais',
    pl: '• <strong style="color: #ffffff;">Wyróżnij</strong> swój profil wśród pozostałych',
  },
  launchCreditsLimited: {
    es: 'Este regalo es por tiempo limitado durante nuestro lanzamiento. 🚀',
    en: 'This gift is for a limited time during our launch. 🚀',
    nl: 'Dit cadeau is voor een beperkte tijd tijdens onze lancering. 🚀',
    pt: 'Este presente é por tempo limitado durante nosso lançamento. 🚀',
    pl: 'Ten prezent jest dostępny przez ograniczony czas podczas naszego startu. 🚀',
  },
  launchCreditsSubject: {
    es: '🎁 ¡{name}, tienes {credits} créditos de regalo en {appName}!',
    en: '🎁 {name}, you have {credits} gift credits at {appName}!',
    nl: '🎁 {name}, je hebt {credits} cadeau tegoeden bij {appName}!',
    pt: '🎁 {name}, você tem {credits} créditos de presente no {appName}!',
    pl: '🎁 {name}, masz {credits} darmowych kredytów w {appName}!',
  },
  launchCreditsTextVersion: {
    es: 'Como regalo de lanzamiento, hemos añadido {credits} créditos a tu cuenta en {appName}.',
    en: 'As a launch gift, we have added {credits} credits to your account at {appName}.',
    nl: 'Als lanceringscadeau hebben we {credits} tegoeden aan je account bij {appName} toegevoegd.',
    pt: 'Como presente de lançamento, adicionamos {credits} créditos à sua conta no {appName}.',
    pl: 'Jako prezent na start, dodaliśmy {credits} kredytów do Twojego konta w {appName}.',
  },
  launchCreditsTextUse: {
    es: 'Úsalos para:',
    en: 'Use them for:',
    nl: 'Gebruik ze voor:',
    pt: 'Use-os para:',
    pl: 'Użyj ich do:',
  },
  launchCreditsTextAction1: {
    es: '- Activar un Boost para aparecer en la primera posición',
    en: '- Activate a Boost to appear in the first position',
    nl: '- Activeer een Boost om op de eerste positie te verschijnen',
    pt: '- Ative um Boost para aparecer na primeira posição',
    pl: '- Aktywuj Boost, aby pojawić się na pierwszej pozycji',
  },
  launchCreditsTextAction2: {
    es: '- Promocionar tu anuncio para mayor alcance',
    en: '- Promote your ad for greater reach',
    nl: '- Promoot je advertentie voor een groter bereik',
    pt: '- Promova seu anúncio para maior alcance',
    pl: '- Promuj swoje ogłoszenie, aby dotrzeć do większej liczby osób',
  },
  launchCreditsTextAction3: {
    es: '- Destacar tu perfil entre las demás',
    en: '- Highlight your profile among the rest',
    nl: '- Markeer je profiel tussen de rest',
    pt: '- Destaque seu perfil entre os demais',
    pl: '- Wyróżnij swój profil wśród pozostałych',
  },
  launchCreditsTextLimited: {
    es: 'Este regalo es por tiempo limitado durante nuestro lanzamiento.',
    en: 'This gift is for a limited time during our launch.',
    nl: 'Dit cadeau is voor een beperkte tijd tijdens onze lancering.',
    pt: 'Este presente é por tempo limitado durante nosso lançamento.',
    pl: 'Ten prezent jest dostępny przez ograniczony czas podczas naszego startu.',
  },

  // ── Welcome Text Version ──
  welcomeTextGreeting: {
    es: 'Hola',
    en: 'Hello',
    nl: 'Hallo',
    pt: 'Olá',
    pl: 'Cześć',
  },
  welcomeTextWelcome: {
    es: '¡Bienvenido a',
    en: 'Welcome to',
    nl: 'Welkom bij',
    pt: 'Bem-vindo ao',
    pl: 'Witaj w',
  },
  welcomeTextSignature: {
    es: 'Saludos,\nEl equipo de',
    en: 'Regards,\nThe team at',
    nl: 'Met vriendelijke groet,\nHet team van',
    pt: 'Saudações,\nA equipe do',
    pl: 'Pozdrowienia,\nZespół',
  },
};

/**
 * Get translated string by key and language.
 * Falls back to Spanish if key not found for the given language.
 */
export function emailT(lang: EmailLang, key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] ?? entry['es'] ?? key;
}
