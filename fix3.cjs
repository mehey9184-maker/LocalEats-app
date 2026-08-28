const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

// We are going to replace everything from `            <button\n              onClick={() => onShopSelect(activeShop)}` to the end of the file.
const splitStr = `            <button\n              onClick={() => onShopSelect(activeShop)}`;
const splitIndex = file.indexOf(splitStr);
if (splitIndex !== -1) {
  file = file.substring(0, splitIndex);
  file += `            <button
              onClick={() => onShopSelect(activeShop)}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors"
            >
              View Store Menu
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;
  fs.writeFileSync('src/App.tsx', file);
  console.log("Fixed again again!");
} else {
  console.log("Not found");
}
