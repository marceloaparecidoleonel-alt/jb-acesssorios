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
    apiKey:            "COLE_SUA_API_KEY_AQUI",
    authDomain:        "SEU_PROJETO.firebaseapp.com",
    projectId:         "SEU_PROJETO_ID",
    storageBucket:     "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId:             "SEU_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const db   = firebase.firestore();
const auth = firebase.auth();

// Email fixo do admin (pode trocar para o que criou no Firebase)
const ADMIN_EMAIL = 'admin@jbacessorios.com';
