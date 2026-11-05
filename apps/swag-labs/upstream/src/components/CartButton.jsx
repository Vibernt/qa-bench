import React, { useEffect, useState } from "react";
import { withRouter } from "../utils/withRouter";
import PropTypes from "prop-types";
import { ShoppingCart } from "../utils/shopping-cart";
import { ROUTES } from "../utils/Constants";
import "./CartButton.css";
import { benchChange } from "../utils/QaBench"; // QA-BENCH

const CartButton = (props) => {
  const { history } = props;
  let cartBadge = "";
  const [cartContents, setCartContents] = useState(
    ShoppingCart.getCartContents(),
  );
  // Strangely enough this is being called, but not covered in the report
  /* istanbul ignore next */
  const cartListener = {
    forceUpdate: () => setCartContents(ShoppingCart.getCartContents()),
  };

  useEffect(() => {
    ShoppingCart.registerCartListener(cartListener);
  }, []);

  if (cartContents.length > 0) {
    cartBadge = (
      <span className="shopping_cart_badge" data-test="shopping-cart-badge">
        {cartContents.length}
      </span>
    );
  }

  const cartWord = benchChange("relabel") ? "Basket" : "Cart"; // QA-BENCH: relabel

  return (
    <a
      className="shopping_cart_link"
      onClick={() => history.push(ROUTES.CART)}
      data-test="shopping-cart-link"
      role="button"
      aria-label={
        cartContents.length > 0
          ? `${cartWord}, ${cartContents.length} items`
          : `${cartWord}, empty`
      }
    >
      {cartBadge}
    </a>
  );
};

CartButton.propTypes = {
  /**
   * The history
   */
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};

export default withRouter(CartButton);
