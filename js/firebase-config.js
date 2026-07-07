/* =====================================================
   JB Acessórios - Firebase Configuration
   
   INSTRUÇÕES:
   1. Acesse console.firebase.google.com
   2. Crie um projeto (ex: jb-acessorios)
   3. Adicione um app Web ao projeto
   4. Copie as credenciais abaixo substituindo os valores
   5. No Console Firebase, ative:
      - Authentication > Sign-in method > Email/Password
      - Firestore Database (modo produção)
   6. Em Authentication > Users, crie o usuário admin:
      - Email: admin@jbacessorios.com
      - Senha: (sua senha)
   ===================================================== */

const firebaseConfig = {
    apiKey:            "AIzaSyDCVxhF2HyGj1k5laP-M3TRieTnATIkYqw",
    authDomain:        "jb-acessorios.firebaseapp.com",
    projectId:         "jb-acessorios",
    storageBucket:     "jb-acessorios.firebasestorage.app",
    messagingSenderId: "308067390507",
    appId:             "1:308067390507:web:5d47ed6becf5ab0cad466e"
};

firebase.initializeApp(firebaseConfig);

const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

// Email fixo do admin (o mesmo que cadastrou no Firebase Authentication)
const ADMIN_EMAIL = 'admin@jbacessorios.com';
