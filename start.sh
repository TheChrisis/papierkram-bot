echo "Papierkram Bot V1"
echo "--------------------------------"
echo "Automatisch Zeiten buchen vom Start Datum bis End Datum - Wochenenden ausgeschlossen."

read -p 'Start Datum (Format: DD.MM.YYYY): ' startdatevar
read -p 'End Datum (Format: DD.MM.YYYY): ' enddatevar
read -p 'Start Zeit: (Format: HH:MM) ' starttimevar
read -p 'End Zeit: (Format: HH:MM) ' endtimevar

if [ -f history.json ]; then
  urlvar=$(grep -o '"url": "[^"]*' history.json | grep -o '[^"]*$')
  descriptionvar=$(grep -o '"subject": "[^"]*' history.json | grep -o '[^"]*$')
  emailvar=$(grep -o '"email": "[^"]*' history.json | grep -o '[^"]*$')
  echo "Folgende E-Mail wird verwendet:" $emailvar
else
  read -p 'Papierkram URL: ' urlvar
  read -p 'Tätigkeitsbeschreibung: (zB Entwicklung) ' descriptionvar
  read -p 'Email Adresse: ' emailvar
fi

echo 'Passwort: '
read -s passwortvar

if test -z "$startdatevar" || test -z "$enddatevar" || test -z "$starttimevar" || test -z "$endtimevar" || test -z "$startdatevar" || test -z "$descriptionvar" || test -z "$emailvar" || test -z "$passwortvar"; then
      echo "Ein Argument ist leer. Bitte alle Argumente ausfüllen!"
      exit 0
fi


if [ ! -d "node_modules" ]; then
    echo "Node Modules existieren nicht. Werden installiert: "
    npm install
fi

node index.js "$startdatevar" "$enddatevar" "$starttimevar" "$endtimevar" "$descriptionvar" "$emailvar" "$passwortvar" "$urlvar"
echo "Script durchgelaufen."
