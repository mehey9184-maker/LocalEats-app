const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');
const badIndex = file.indexOf('favorites.includes(ax');
if (badIndex !== -1) {
  file = file.substring(0, badIndex);
  // append closing tags for ExploreScreen
  file += `activeShop.id) ? "fill-current" : ""}\` />
              </button>
            </div>
            
            <button
              onClick={() => onShopSelect(activeShop)}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors"
            >
              View Store Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`;
  fs.writeFileSync('src/App.tsx', file);
  console.log("Fixed!");
} else {
  console.log("Not found");
}
