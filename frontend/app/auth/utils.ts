import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true
});

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const fullNameRegex = /^[А-Яа-яЁё\s-]+$/;

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+=\-]).{8,}$/;

export const passwordMeetsRules = (password: string) => passwordRegex.test(password);
