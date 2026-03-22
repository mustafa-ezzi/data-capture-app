import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const productsRef = collection(db, "products");

export const addProduct = async (product) => {
  return await addDoc(productsRef, product);
};

export const getProducts = async () => {
  const snapshot = await getDocs(productsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};