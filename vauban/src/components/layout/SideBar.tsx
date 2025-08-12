import React from "react";
import { NavLink } from "react-router-dom";

export default function SideBar() {
  return (
    <nav className="h-screen w-56 bg-blue-50 shadow-lg flex flex-col py-6">
      <div className="text-xl font-bold text-blue-900 px-6 mb-6">Stratégie Vauban</div>
      <NavLink to="/dashboard" className="py-2 px-6 hover:bg-blue-200">Dashboard</NavLink>
      <NavLink to="/entreprise" className="py-2 px-6 hover:bg-blue-200">Entreprise</NavLink>
      <NavLink to="/equipe" className="py-2 px-6 hover:bg-blue-200">Équipe</NavLink>
      <NavLink to="/risques" className="py-2 px-6 hover:bg-blue-200">Risques (DUER)</NavLink>
      <NavLink to="/pca" className="py-2 px-6 hover:bg-blue-200">PCA</NavLink>
      <NavLink to="/actions" className="py-2 px-6 hover:bg-blue-200">Plan d’actions</NavLink>
      <NavLink to="/pdf" className="py-2 px-6 hover:bg-blue-200">Export PDF</NavLink>
      <NavLink to="/settings" className="py-2 px-6 hover:bg-blue-200">Paramètres</NavLink>
      <NavLink to="/simulateur" className="py-2 px-6 text-gray-400 cursor-not-allowed">Simulateur de crise <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded ml-1">En travaux</span></NavLink>
      <NavLink to="/exercices" className="py-2 px-6 text-gray-400 cursor-not-allowed">Exercices de crise <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded ml-1">En travaux</span></NavLink>
      <NavLink to="/communications" className="py-2 px-6 text-gray-400 cursor-not-allowed">Communication <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded ml-1">En travaux</span></NavLink>
    </nav>
  );
}
