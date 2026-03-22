import axios from "axios";

const API = axios.create({
  baseURL: "http://10.24.217.56:3000", 
});

export default API;