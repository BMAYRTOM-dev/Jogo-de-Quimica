import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, serverTimestamp, collection, updateDoc, addDoc, where, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyASzgfsUYWNlTzNNeizcANY0iUANsjo1qI",
  authDomain: "jogo-de-quimica-6dc9c.firebaseapp.com",
  projectId: "jogo-de-quimica-6dc9c",
  storageBucket: "jogo-de-quimica-6dc9c.firebasestorage.app",
  messagingSenderId: "444940052245",
  appId: "1:444940052245:web:1afef1a5f8e4be18c2eb1c",
  measurementId: "G-DZ9KYF4WVX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


export async function saveScore(name, score) {
  try {
    // Verifica se já existe um registro com o mesmo nome
    const q = query(
      collection(db, "scores"),
      where("name", "==", name)
    );
    console.log('trey')

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Se existir, pega o primeiro documento (assumindo nomes únicos)
      const docRef = querySnapshot.docs[0].ref;
      const existingScore = querySnapshot.docs[0].data().score;
      console.log(existingScore)

      // Atualiza apenas se o novo score for maior
      if (score > existingScore) {
        await updateDoc(docRef, {
          score: score,
          timestamp: serverTimestamp()
        });
        console.log("Score atualizado!");
      }
    } else {
      // Se não existir, cria um novo registro
      await addDoc(collection(db, "scores"), {
        name: name,
        score: score,
        timestamp: serverTimestamp()
      });
      console.log("Novo score salvo!");
    }
  } catch (e) {
    console.error("Erro ao salvar score: ", e);
  }
}

export async function getRanking() {
  const ranking = [];
  const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(10));

  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    ranking.push(doc.data());
  });

  return ranking;
}