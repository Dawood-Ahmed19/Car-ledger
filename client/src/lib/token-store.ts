import * as SecureStore from "expo-secure-store";

const KEY = "carledger_token";
export const getToken = () => SecureStore.getItemAsync(KEY);
export const saveToken = (t: string) => SecureStore.setItemAsync(KEY, t);
export const deleteToken = () => SecureStore.deleteItemAsync(KEY);
