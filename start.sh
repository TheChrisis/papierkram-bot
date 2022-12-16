echo "Papierkram Bot V1"
echo "--------------------------------"
echo "Automatisch Zeiten buchen vom Start Datum bis End Datum - Wochenenden ausgeschlossen."
if [ ! -f history.json ];
then
  read -p 'Papierkram URL: ' urlvar
else
  urlvar=$(grep -o '"url": "[^"]*' history.json | grep -o '[^"]*$')
fi
read -p 'Start Datum (Format: DD.MM.YYYY): ' startdatevar
read -p 'End Datum (Format: DD.MM.YYYY): ' enddatevar
read -p 'Start Zeit: (Format: HH:MM) ' starttimevar
read -p 'End Zeit: (Format: HH:MM) ' endtimevar
if [ ! -f history.json ];
then
  read -p 'Tätigkeitsbeschreibung: (zB Entwicklung) ' descriptionvar
else
  descriptionvar=$(grep -o '"subject": "[^"]*' history.json | grep -o '[^"]*$')
fi
if [ ! -f history.json ];
then
  read -p 'Email Adresse: ' emailvar
else
  emailvar=$(grep -o '"email": "[^"]*' history.json | grep -o '[^"]*$')
  echo "Folgende E-Mail wird verwendet:" $emailvar
fi
echo 'Passwort: '
read -s passwortvar

if test -z "$startdatevar" || test -z "$enddatevar" || test -z "$starttimevar" || test -z "$endtimevar" || test -z "$startdatevar" || test -z "$descriptionvar" || test -z "$emailvar" || test -z "$passwortvar"
then
      echo "Ein Argument ist leer. Bitte alle Argumente ausfüllen!"
      exit 0
fi

DIR="node_modules"
if [ ! -d "$DIR" ]; then
    echo "Node Modules existieren nicht. Werden installiert: "
    npm install
fi

node index.js $startdatevar $enddatevar $starttimevar $endtimevar "$descriptionvar" $emailvar $passwortvar $urlvar
echo "Script durchgelaufen."
